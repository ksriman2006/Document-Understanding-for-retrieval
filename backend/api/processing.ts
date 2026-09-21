import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { processDocumentPipeline } from '../services/pipeline.ts';

const router = Router();

// POST /api/documents/:id/process
router.post('/:id/process', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Trigger processing asynchronously
  processDocumentPipeline(doc.id, req.user!.id).catch((err) => {
    console.error(`Error reprocessing doc ${doc.id}:`, err);
  });

  return res.json({
    message: 'Pipeline processing started successfully.',
    documentId: doc.id,
    status: 'PROCESSING',
  });
});

// GET /api/documents/:id/status
router.get('/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const elements = db.getElements(doc.id, req.user!.id);
  const tables = db.getTables(doc.id, req.user!.id);
  const chunks = db.getChunks(doc.id, req.user!.id);

  return res.json({
    documentId: doc.id,
    filename: doc.originalName,
    status: doc.status,
    errorMessage: doc.errorMessage,
    pageCount: doc.pageCount,
    uploadedAt: doc.uploadedAt,
    processedAt: doc.processedAt,
    metadata: doc.metadata,
    summary: {
      elementsCount: elements.length,
      tablesCount: tables.length,
      chunksCount: chunks.length,
    },
  });
});

export default router;
