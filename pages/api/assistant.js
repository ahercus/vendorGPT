import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let THREAD_ID = null;

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
    const { message } = req.body;
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Create thread if needed
    if (!THREAD_ID) {
      const thread = await openai.beta.threads.create();
      THREAD_ID = thread.id;
    }

    // Add message to thread
    await openai.beta.threads.messages.create(
      THREAD_ID,
      {
        role: 'user',
        content: message
      }
    );

    // Run assistant
    const run = await openai.beta.threads.runs.create(
      THREAD_ID,
      { assistant_id: process.env.ASSISTANT_ID }
    );

    // Wait for completion
    let runStatus;
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) { // 10 second timeout
      runStatus = await openai.beta.threads.runs.retrieve(
        THREAD_ID,
        run.id
      );

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(THREAD_ID);
        const response = messages.data[0].content[0].text.value;
        
        return res.status(200).json({ response });
      }

      if (runStatus.status === 'failed') {
        throw new Error(`Run failed: ${runStatus.last_error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Assistant took too long to respond');

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