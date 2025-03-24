export default async function handler(req, res) {
  const { search_term } = req.query;
  
  if (!search_term) {
    return res.status(400).json({ error: 'Missing search_term parameter' });
  }
  
  try {
    const searchUrl = `https://google-sheets-api-delta.vercel.app/api/search?search_term=${encodeURIComponent(search_term)}`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      return res.status(searchResponse.status).json({ 
        error: `Search API returned status ${searchResponse.status}` 
      });
    }
    
    const data = await searchResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error testing search API:', error);
    return res.status(500).json({ error: error.message });
  }
} 