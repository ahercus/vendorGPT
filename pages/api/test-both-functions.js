export default async function handler(req, res) {
  try {
    const { file_name, company_name } = req.query;
    const results = {};
    
    if (file_name) {
      const searchResponse = await fetch(`https://google-sheets-api-delta.vercel.app/api/search?file_name=${encodeURIComponent(file_name)}`);
      results.file_search = await searchResponse.json();
    }
    
    if (company_name) {
      const contactResponse = await fetch(`https://google-sheets-api-delta.vercel.app/api/contact?company_name=${encodeURIComponent(company_name)}`);
      results.contact_search = await contactResponse.json();
    }
    
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 