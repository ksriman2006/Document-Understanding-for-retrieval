import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, UPLOADS_DIR } from '../database/db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth/security.ts';
import { processDocumentPipeline } from '../services/pipeline.ts';
import { seedSampleDocumentsForUser } from '../sample_data/sample_documents.ts';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Only PDF, DOCX, and TXT files are accepted.'));
    }
  },
});

// GET /api/documents
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const docs = db.getDocuments(req.user!.id);
  // Sort newest first
  docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return res.json({ documents: docs });
});

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file rejected by validator.' });
    }

    if (req.file.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Uploaded file is empty (0 bytes).' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ext === '.pdf' ? 'pdf' : ext === '.docx' ? 'docx' : 'txt';
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newDoc = db.createDocument({
      id: documentId,
      userId: req.user!.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      pageCount: 1,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      filePath: req.file.path,
    });

    // Automatically trigger processing pipeline in background
    processDocumentPipeline(documentId, req.user!.id).catch((err) => {
      console.error(`Background processing failed for ${documentId}:`, err);
    });

    return res.status(201).json({
      document: newDoc,
      message: 'File uploaded successfully. Processing pipeline started.',
    });
  } catch (err: any) {
    console.error('Upload handling error:', err);
    return res.status(500).json({ error: err.message || 'File upload error.' });
  }
});

// POST /api/documents/seed-samples
router.post('/seed-samples', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await seedSampleDocumentsForUser(req.user!.id);
    return res.json({
      success: true,
      message: `Successfully seeded and processed ${count} benchmark documents.`,
      count,
    });
  } catch (err: any) {
    console.error('Seed samples error:', err);
    return res.status(500).json({ error: 'Failed to seed sample documents.' });
  }
});

// GET /api/documents/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  return res.json({ document: doc });
});

// DELETE /api/documents/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteDocument(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }
  return res.json({ success: true, message: 'Document and all extracted elements removed.' });
});

// GET /api/documents/:id/layout
router.get('/:id/layout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  const elements = db.getElements(doc.id, req.user!.id);
  return res.json({
    documentId: doc.id,
    filename: doc.originalName,
    elementsCount: elements.length,
    elements,
  });
});

// GET /api/documents/:id/reading-order
router.get('/:id/reading-order', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  const elements = db.getElements(doc.id, req.user!.id);

  // Provide both Naive Scanline order and Reconstructed Reading Order for side-by-side comparison
  const naiveSorted = [...elements].sort((a, b) => a.naiveOrderIndex - b.naiveOrderIndex);
  const reconstructedSorted = [...elements].sort((a, b) => a.readingOrderIndex - b.readingOrderIndex);

  return res.json({
    documentId: doc.id,
    filename: doc.originalName,
    isMultiColumn: doc.metadata?.isMultiColumn ?? false,
    elementsCount: elements.length,
    naiveOrder: naiveSorted,
    reconstructedOrder: reconstructedSorted,
  });
});

// GET /api/documents/:id/tables
router.get('/:id/tables', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  const tables = db.getTables(doc.id, req.user!.id);
  return res.json({ tables });
});

// GET /api/documents/:id/formulas
router.get('/:id/formulas', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id, req.user!.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  const formulas = db.getFormulas(doc.id, req.user!.id);
  return res.json({ formulas });
});

export default router;
