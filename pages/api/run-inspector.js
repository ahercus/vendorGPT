import { OpenAI } from 'openai';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { thread_id, run_id } = req.query;
    
    if (!thread_id || !run_id) {
      return res.status(400).json({ error: 'thread_id and run_id are required' });
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    // Get run details
    const run = await openai.beta.threads.runs.retrieve(thread_id, run_id);
    
    // Get run steps
    const steps = await openai.beta.threads.runs.steps.list(thread_id, run_id);
    
    // Get messages
    const messages = await openai.beta.threads.messages.list(thread_id);
    
    return res.status(200).json({
      run,
      steps: steps.data,
      messages: messages.data
    });
  } catch (error) {
    console.error('Run inspector error:', error);
    return res.status(500).json({ error: error.message });
  }
} 