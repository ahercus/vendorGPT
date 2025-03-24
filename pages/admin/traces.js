import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TracesViewer() {
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchTraces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/traces', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTraces(data);
      } else {
        alert('Failed to fetch traces');
      }
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewTrace = (sessionId) => {
    const trace = traces.find(t => t.sessionId === sessionId);
    setSelectedTrace(trace);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Trace Viewer</h1>
      
      <div className="mb-4">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API Key"
          className="border p-2 mr-2"
        />
        <button 
          onClick={fetchTraces}
          disabled={isLoading}
          className="bg-blue-500 text-white p-2 rounded"
        >
          {isLoading ? 'Loading...' : 'Fetch Traces'}
        </button>
      </div>
      
      <div className="flex">
        <div className="w-1/3 pr-4">
          <h2 className="text-xl font-bold mb-2">Sessions</h2>
          {traces.length === 0 ? (
            <p>No traces found</p>
          ) : (
            <ul className="border rounded">
              {traces.map(trace => (
                <li 
                  key={trace.sessionId}
                  className="p-2 border-b cursor-pointer hover:bg-gray-100"
                  onClick={() => viewTrace(trace.sessionId)}
                >
                  <div className="font-medium">{trace.sessionId}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(trace.startTime).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="w-2/3 pl-4">
          <h2 className="text-xl font-bold mb-2">Trace Details</h2>
          {selectedTrace ? (
            <div className="border rounded p-4">
              <div className="mb-4">
                <h3 className="font-bold">Session ID: {selectedTrace.sessionId}</h3>
                <div>Started: {new Date(selectedTrace.startTime).toLocaleString()}</div>
                {selectedTrace.endTime && (
                  <div>Ended: {new Date(selectedTrace.endTime).toLocaleString()}</div>
                )}
                <div>Status: {selectedTrace.status || 'In Progress'}</div>
              </div>
              
              <h3 className="font-bold mb-2">Events</h3>
              <div className="overflow-auto max-h-96">
                {selectedTrace.events.map((event, index) => (
                  <div key={index} className="mb-2 p-2 border rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{event.type}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-sm mt-1 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Select a trace to view details</p>
          )}
        </div>
      </div>
    </div>
  );
} 