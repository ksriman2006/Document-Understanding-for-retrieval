import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { retrieveRelevantContext } from '../retrieval/engine.ts';
import { db } from '../database/db.ts';

const router = Router();

// POST /api/search
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, topK, documentId } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const searchResults = await retrieveRelevantContext(req.user!.id, query.trim(), {
      topK: typeof topK === 'number' ? topK : 5,
      documentId,
    });

    return res.json(searchResults);
  } catch (err: any) {
    console.error('Search API error:', err);
    return res.status(500).json({ error: 'Failed to perform semantic retrieval.' });
  }
});

// GET /api/search/history
router.get('/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const history = db.getSearchHistory(req.user!.id, 20);
  return res.json({ history });
});

export default router;
