import { NextApiRequest, NextApiResponse } from 'next';
const tracer = require('../../utils/tracing');

export default async function handler(req, res) {
  // Basic auth for protection
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.TRACE_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { sessionId } = req.query;
    
    if (sessionId) {
      // Get a specific trace
      const trace = tracer.getTrace(sessionId);
      if (!trace) {
        return res.status(404).json({ error: 'Trace not found' });
      }
      return res.status(200).json(trace);
    } else {
      // Get all traces
      const traces = tracer.getAllTraces();
      return res.status(200).json(traces);
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 