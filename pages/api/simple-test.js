import { OpenAI } from 'openai';

export default async function handler(req, res) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    // Create a thread
    const thread = await openai.beta.threads.create();
    
    // Add a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "I need a vendor that targets millennials"
    });
    
    // Create a run with NO overrides
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
      // No other parameters - use the dashboard settings exactly
    });
    
    // Wait for completion
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      // If tool call is required, handle it
      if (runStatus.status === "requires_action") {
        console.log("Tool call required:", runStatus.required_action);
        
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = await Promise.all(toolCalls.map(async (toolCall) => {
          if (toolCall.function.name === "search_sheet_file") {
            const args = JSON.parse(toolCall.function.arguments);
            const searchTerm = args.search_term || args.file_name;
            console.log('Searching for:', searchTerm);
            
            try {
              const searchUrl = `https://google-sheets-api-delta.vercel.app/api/search?file_name=${encodeURIComponent(searchTerm)}`;
              const searchResponse = await fetch(searchUrl);
              const data = await searchResponse.json();
              
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
          }
          return null;
        }));
        
        await openai.beta.threads.runs.submitToolOutputs(
          thread.id,
          run.id,
          {
            tool_outputs: toolOutputs.filter(output => output !== null)
          }
        );
      }
    } while (runStatus.status === "queued" || runStatus.status === "in_progress" || runStatus.status === "requires_action");
    
    // Get response
    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0].text.value;
      
      return res.status(200).json({
        response,
        runStatus
      });
    } else {
      return res.status(500).json({
        error: `Run failed: ${runStatus.last_error?.message || 'Unknown error'}`,
        runStatus
      });
    }
  } catch (error) {
    console.error('Simple test error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
} 