import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { executeRAGQuery } from '../rag/service.ts';
import { db } from '../database/db.ts';

const router = Router();

// POST /api/rag/query
router.post('/query', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, documentId } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const ragResult = await executeRAGQuery(req.user!.id, question.trim(), documentId);
    return res.json(ragResult);
  } catch (err: any) {
    console.error('RAG query API error:', err);
    return res.status(500).json({ error: 'Failed to process RAG query.' });
  }
});

// GET /api/rag/history
router.get('/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const history = db.getRAGQueries(req.user!.id, 20);
  return res.json({ history });
});

export default router;
