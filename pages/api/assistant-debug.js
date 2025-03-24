export default async function handler(req, res) {
  try {
    // Debug information
    return res.status(200).json({
      assistant_id: process.env.ASSISTANT_ID,
      search_endpoint: "https://google-sheets-api-delta.vercel.app/api/search"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 