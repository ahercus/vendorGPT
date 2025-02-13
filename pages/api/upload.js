import { formidable } from 'formidable';
import OpenAI from 'openai';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the file
    const form = formidable();
    const [, files] = await form.parse(req);
    
    if (!files?.file?.[0]) {
      throw new Error('No file uploaded');
    }

    const file = files.file[0];

    // Upload file to OpenAI
    const fileStream = fs.createReadStream(file.filepath);
    const uploadedFile = await openai.files.create({
      file: fileStream,
      purpose: 'assistants',
    });

    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Add a simple message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `I've uploaded a file named ${file.originalFilename} for analysis. Please review it.`
    });

    // Run the assistant with the file
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
      additional_files: [uploadedFile.id]  // Pass the file here
    });

    // Clean up
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      file: {
        id: uploadedFile.id,
        filename: file.originalFilename,
        threadId: thread.id,
        runId: run.id
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
} 