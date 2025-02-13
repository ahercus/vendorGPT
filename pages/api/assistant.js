import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let THREAD_ID = null;

function cleanResponse(text) {
  // Remove citations like 【8:0†Marketing summary.json】
  let cleaned = text.replace(/【[^】]+】/g, '');
  
  // Convert markdown bold to HTML
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Split into paragraphs, preserving numbered lists
  const paragraphs = [];
  let currentParagraph = [];
  
  cleaned.split('\n').forEach(line => {
    line = line.trim();
    if (!line) {  // Empty line indicates paragraph break
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    } else {
      // Check if line starts with a number or bullet
      if (/^\d+\.|^- /.test(line)) {
        // If we have a previous paragraph, save it
        if (currentParagraph.length) {
          paragraphs.push(currentParagraph.join(' '));
          currentParagraph = [];
        }
        // Convert dash to bullet
        if (line.startsWith('- ')) {
          line = '• ' + line.substring(2);
        }
        paragraphs.push(line);
      } else {
        currentParagraph.push(line);
      }
    }
  });
  
  // Add any remaining paragraph
  if (currentParagraph.length) {
    paragraphs.push(currentParagraph.join(' '));
  }
  
  // Rejoin with proper spacing
  return paragraphs.filter(p => p.trim()).join('\n\n');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, threadId } = req.body;
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Use provided thread ID or create new one
    const currentThreadId = threadId || (await openai.beta.threads.create()).id;

    // Add the message to the thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Wait for the run to complete
    let runStatus;
    while (true) {
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      
      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        const response = messages.data[0].content[0].text.value;
        return res.status(200).json({ response: cleanResponse(response) });
      }

      if (runStatus.status === 'failed') {
        throw new Error(`Run failed: ${runStatus.last_error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: {
        message: error.message,
        type: error.constructor.name
      }
    });
  }
} 