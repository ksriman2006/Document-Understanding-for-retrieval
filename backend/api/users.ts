import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { db } from '../database/db.ts';

const router = Router();

// GET /api/users/profile
router.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stats = db.getUserStats(user.id);
  const docs = db.getDocuments(user.id);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    stats,
    recentDocuments: docs.slice(0, 5),
    systemInfo: {
      llmModel: process.env.LLM_MODEL || 'gemini-3.8-flash',
      embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview',
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
