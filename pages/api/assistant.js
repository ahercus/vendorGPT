import { OpenAI } from 'openai';

// Use a database in production instead of this in-memory store
const userSessions = new Map();

// Add this to your session management
const MAX_CONVERSATION_LENGTH = 10;

function cleanResponse(text) {
  if (!text) return '';
  
  // Handle if text is not a string (rare but possible)
  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text);
    } catch (e) {
      return 'Error processing response';
    }
  }
  
  // Remove any citations or special markers
  let cleaned = text.replace(/【[^】]+】/g, '');
  
  // Remove any XML tags sometimes used by the model
  cleaned = cleaned.replace(/<answer>([\s\S]*?)<\/answer>/g, '$1');
  cleaned = cleaned.replace(/<thinking>([\s\S]*?)<\/thinking>/g, '');
  
  // DO NOT escape asterisks or other markdown characters
  // Just return the cleaned text
  return cleaned;
}

// Add this function to pre-format the response on the server side
function preFormatResponse(text) {
  if (!text) return '';
  
  // Replace markdown bold with HTML bold
  while (text.includes('**')) {
    text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  
  // Replace markdown links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  return text;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  // Store the sessionId at the top level so it's available in the catch block
  let userSessionId;

  try {
    console.log('Starting request processing...');
    const { message, sessionId } = req.body;
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.ASSISTANT_ID;
    
    // Require proper API configuration - NO MOCK RESPONSES
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
    }
    
    if (!assistantId || assistantId === 'your_assistant_id_here') {
      throw new Error('OpenAI Assistant ID is not configured. Please set ASSISTANT_ID in your environment variables.');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Get or create session
    userSessionId = sessionId || Math.random().toString(36).substring(2, 15);
    let session = userSessions.get(userSessionId) || { previousResponseId: null };
    
    // Track messages for future summarization
    if (!session.messages) session.messages = [];
    session.messages.push({ role: "user", content: message });

    // Before creating a new response, check if we need to summarize
    if (session.messages.length > MAX_CONVERSATION_LENGTH) {
      console.log("Conversation summarized to manage context window");
      
      // Use the Assistants API instead of Responses API for summarization
      try {
        // Create a temporary thread for summarization
        const thread = await openai.beta.threads.create();
        
        // Add the messages to the thread
        for (const msg of session.messages) {
          await openai.beta.threads.messages.create(thread.id, {
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        }
        
        // Create a run to summarize the conversation
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: process.env.ASSISTANT_ID || "asst_abc123", // Replace with your actual Assistant ID
          instructions: "Create a concise summary that preserves the key context from this conversation about vendor information requests."
        });
        
        // Wait for the run to complete
        let summarizationRun;
        do {
          await new Promise(resolve => setTimeout(resolve, 1000));
          summarizationRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        } while (summarizationRun.status === "queued" || summarizationRun.status === "in_progress");
        
        if (summarizationRun.status === "completed") {
          // Get the summary message
          const messages = await openai.beta.threads.messages.list(thread.id);
          const summary = messages.data[0].content[0].text.value;
          
          // Start a new conversation with the summary as context
          session = {
            previousResponseId: null,
            messages: [{
              role: "system",
              content: `Previous conversation summary: ${summary}`
            }]
          };
        } else {
          throw new Error("Summarization failed");
        }
      } catch (error) {
        console.error("Error summarizing conversation:", error);
        // Fall back to keeping the most recent messages if summarization fails
        session.messages = session.messages.slice(-5);
      }
    }

    // For the main conversation, also use the Assistants API instead of Responses API
    // Create a thread if one doesn't exist
    if (!session.threadId) {
      const thread = await openai.beta.threads.create();
      session.threadId = thread.id;
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(session.threadId, {
      role: "user",
      content: message
    });

    // Create a run WITHOUT any overrides - let the dashboard settings work
    //
    // Model choice is intentionally NOT wired to ecosystem_model_config here.
    // The OpenAI Assistants API resolves its own model from whatever is set
    // on the Assistant object in the OpenAI dashboard (platform.openai.com),
    // not from a `model` param on the run — passing one would override the
    // dashboard config, which is the deliberate source of truth for this app.
    // The "stalker"/"assistant" row in ecosystem_model_config is aspirational
    // metadata only; to actually change Stalker's model, update the
    // Assistant in the OpenAI dashboard.
    const run = await openai.beta.threads.runs.create(session.threadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // Inside the handler function, before creating the run
    console.log('Session ID:', userSessionId);
    console.log('Assistant ID:', process.env.ASSISTANT_ID);
    console.log('Incoming message:', message);

    // Process the run
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(session.threadId, run.id);
      console.log('Run status:', runStatus.status);
      
      // Handle tool calls
      if (runStatus.status === "requires_action") {
        console.log('Run requires action:');
        console.log(JSON.stringify(runStatus.required_action, null, 2));
        
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        console.log(`Number of tool calls requested: ${toolCalls.length}`);
        
        const toolOutputs = await Promise.all(toolCalls.map(async (toolCall) => {
          console.log(`Processing tool call: ${toolCall.function.name}`);
          console.log(`Arguments: ${toolCall.function.arguments}`);
          
          // Process each tool type
          if (toolCall.function.name === "search_sheet_file") {
            const args = JSON.parse(toolCall.function.arguments);
            console.log('Function args:', args);
            const searchTerm = args.search_term || args.file_name; // Support both parameter names
            console.log('Searching for:', searchTerm);
            
            try {
              const searchUrl = `https://google-sheets-api-delta.vercel.app/api/search?q=${encodeURIComponent(searchTerm)}`;
              const searchResponse = await fetch(searchUrl);
              console.log('Search API response status:', searchResponse.status);
              const data = await searchResponse.json();
              console.log('Search API response data:', data);
              
              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify(data)
              };
            } catch (error) {
              console.error('Error calling search API:', error);
              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: 'Failed to search for file' })
              };
            }
          } else if (toolCall.function.name === "search_contact") {
            const args = JSON.parse(toolCall.function.arguments);
            const companyName = args.company_name;
            console.log('Searching for contact:', companyName);
            
            try {
              const contactUrl = `https://google-sheets-api-delta.vercel.app/api/contact?q=${encodeURIComponent(companyName)}`;
              const contactResponse = await fetch(contactUrl);
              console.log('Contact API response status:', contactResponse.status);
              const data = await contactResponse.json();
              console.log('Contact API response data:', data);
              
              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify(data)
              };
            } catch (error) {
              console.error('Error calling contact API:', error);
              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: 'Failed to search for contact' })
              };
            }
          } else {
            console.log(`Unknown tool call: ${toolCall.function.name}`);
            return null;
          }
        }));
        
        console.log('Tool outputs:', JSON.stringify(toolOutputs, null, 2));
        
        // Submit tool outputs
        try {
          const submitResponse = await openai.beta.threads.runs.submitToolOutputs(
            session.threadId,
            run.id,
            {
              tool_outputs: toolOutputs.filter(output => output !== null)
            }
          );
          console.log('Tool outputs submitted successfully');
        } catch (error) {
          console.error('Error submitting tool outputs:', error);
          throw error;
        }
      }
    } while (runStatus.status === "queued" || runStatus.status === "in_progress" || runStatus.status === "requires_action");

    // Get the response
    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(session.threadId);
      
      // Handle potential different response formats
      let response = '';
      
      if (messages.data && messages.data.length > 0) {
        const firstMessage = messages.data[0];
        
        if (firstMessage.content && firstMessage.content.length > 0) {
          // Handle different content types (text, image, etc)
          const contentParts = [];
          
          for (const contentPart of firstMessage.content) {
            if (contentPart.type === 'text') {
              contentParts.push(contentPart.text.value);
            } else if (contentPart.type === 'image_file') {
              // If this is an image response, we can handle it by adding an image tag
              // You would need to expose an endpoint to retrieve the image from OpenAI
              contentParts.push(`[Image: ${contentPart.image_file.file_id}]`);
            }
          }
          
          response = contentParts.join('\n\n');
        } else {
          console.warn('Empty content array in message');
          response = 'No content found in response';
        }
      } else {
        console.warn('No messages returned from OpenAI');
        response = 'No response received';
      }
      
      // Save the session
      if (!session.messages) session.messages = [];
      session.messages.push({ role: "assistant", content: response });
      userSessions.set(userSessionId, session);
      
      console.log("[API] Sending response to client:", cleanResponse(response));
      return res.status(200).json({
        response: preFormatResponse(cleanResponse(response)), // Pre-format here
        sessionId: userSessionId
      });
    } else {
      const errorMessage = runStatus.last_error?.message || 'Unknown error';
      console.error(`Run failed: ${errorMessage}`);
      throw new Error(`Run failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error details:', error);
    
    // Categorize errors for better user feedback
    let userMessage = "Sorry, I encountered an issue. Please try again.";
    let statusCode = 500;
    
    if (error.name === 'OpenAIError') {
      if (error.status === 429) {
        userMessage = "I'm processing too many requests right now. Please try again in a moment.";
        statusCode = 429;
      } else if (error.status === 400) {
        userMessage = "I couldn't understand that request. Could you try rephrasing?";
        statusCode = 400;
      }
    } else if (error.message.includes('search_sheet_file')) {
      userMessage = "I had trouble searching for that file. Could you try a different filename or vendor?";
      statusCode = 200; // Still return 200 for application errors
    } else if (error.message.includes('timeout')) {
      userMessage = "Your request took too long to process. Try a more specific question.";
      statusCode = 408;
    }
    
    return res.status(statusCode).json({
      response: userMessage,
      error: {
        message: error.message,
        type: error.constructor.name,
        status: error.status || 500
      },
      sessionId: userSessionId // Now this is defined
    });
  }
} 