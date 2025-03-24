export default async function handler(req, res) {
  try {
    const { search_term = "millennials" } = req.query;
    
    // Test both parameter styles
    const response1 = await fetch(`https://google-sheets-api-delta.vercel.app/api/search?search_term=${encodeURIComponent(search_term)}`);
    const response2 = await fetch(`https://google-sheets-api-delta.vercel.app/api/search?file_name=${encodeURIComponent(search_term)}`);
    
    const data1 = await response1.json();
    const data2 = await response2.json();
    
    return res.status(200).json({
      using_search_term: {
        status: response1.status,
        data: data1
      },
      using_file_name: {
        status: response2.status,
        data: data2
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
} 