import { processRagQuery } from '../services/ragService.js';

export const handleRagQuery = async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query text is required' });
  }

  try {
    const result = await processRagQuery(query.trim());
    res.json(result);
  } catch (error) {
    console.error('[RAG Controller Error]:', error);
    res.status(500).json({ error: 'Error generating RAG response: ' + error.message });
  }
};

export default {
  handleRagQuery
};
