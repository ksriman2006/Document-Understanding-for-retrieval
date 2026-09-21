import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { runComprehensiveEvaluation } from '../evaluation/evaluator.ts';
import { db } from '../database/db.ts';

const router = Router();

// GET /api/evaluation
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  let latest = db.getLatestEvaluation(req.user!.id);
  if (!latest) {
    latest = runComprehensiveEvaluation(req.user!.id);
  }
  return res.json({ evaluation: latest });
});

// POST /api/evaluation/run
router.post('/run', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const metrics = runComprehensiveEvaluation(req.user!.id);
  return res.json({
    success: true,
    evaluation: metrics,
    message: 'Evaluation suite executed across document layout, reading order, tables and RAG retrieval.',
  });
});

export default router;
