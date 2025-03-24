import { useState } from 'react';

export default function TestTools() {
  const [companyName, setCompanyName] = useState('Spotify');
  const [fileName, setFileName] = useState('Rokt.pdf');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const testContactSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/test-both-functions?company_name=${encodeURIComponent(companyName)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error(error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  const testFileSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/test-both-functions?file_name=${encodeURIComponent(fileName)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error(error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tool Testing Interface</h1>
      
      <div className="mb-6">
        <h2 className="text-xl mb-2">Test Contact Search</h2>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="border p-2 mr-2"
        />
        <button 
          onClick={testContactSearch}
          className="bg-blue-500 text-white p-2 rounded"
          disabled={loading}
        >
          Search Contact
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl mb-2">Test File Search</h2>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="border p-2 mr-2"
        />
        <button 
          onClick={testFileSearch}
          className="bg-blue-500 text-white p-2 rounded"
          disabled={loading}
        >
          Search File
        </button>
      </div>
      
      {results && (
        <div className="mt-4">
          <h2 className="text-xl mb-2">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 