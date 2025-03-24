// Simple tracing utility for OpenAI Responses API
const fs = require('fs').promises;
const path = require('path');

class Tracer {
  constructor(options = {}) {
    this.enabled = options.enabled ?? (process.env.LLM_DEBUG === 'true');
    this.logToConsole = options.logToConsole ?? true;
    this.logToFile = options.logToFile ?? false;
    this.logPath = options.logPath ?? path.join(process.cwd(), 'logs');
    this.traces = new Map(); // sessionId -> trace events
  }

  async startTrace(sessionId, metadata = {}) {
    if (!this.enabled) return;
    
    const trace = {
      sessionId,
      startTime: new Date().toISOString(),
      events: [],
      metadata
    };
    
    this.traces.set(sessionId, trace);
    this.logEvent(sessionId, 'trace.started', { metadata });
    return trace;
  }

  logEvent(sessionId, eventType, data = {}) {
    if (!this.enabled) return;
    
    const trace = this.traces.get(sessionId);
    if (!trace) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data
    };
    
    trace.events.push(event);
    
    if (this.logToConsole) {
      console.log(`[TRACE:${sessionId}] ${eventType}`, JSON.stringify(data, null, 2));
    }
    
    return event;
  }

  async endTrace(sessionId, status = 'completed') {
    if (!this.enabled) return;
    
    const trace = this.traces.get(sessionId);
    if (!trace) return;
    
    trace.endTime = new Date().toISOString();
    trace.status = status;
    
    this.logEvent(sessionId, 'trace.ended', { status });
    
    if (this.logToFile) {
      await this.saveTraceToFile(sessionId);
    }
    
    return trace;
  }

  async saveTraceToFile(sessionId) {
    const trace = this.traces.get(sessionId);
    if (!trace) return;
    
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logPath, { recursive: true });
      
      const filename = `trace_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(this.logPath, filename);
      
      await fs.writeFile(filePath, JSON.stringify(trace, null, 2));
      console.log(`Trace saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving trace to file:', error);
    }
  }

  getTrace(sessionId) {
    return this.traces.get(sessionId);
  }

  getAllTraces() {
    return Array.from(this.traces.values());
  }
}

// Create a singleton instance
const tracer = new Tracer();

module.exports = tracer; 