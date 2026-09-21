import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './backend/api/auth.ts';
import documentsRoutes from './backend/api/documents.ts';
import processingRoutes from './backend/api/processing.ts';
import searchRoutes from './backend/api/search.ts';
import ragRoutes from './backend/api/rag.ts';
import evaluationRoutes from './backend/api/evaluation.ts';
import usersRoutes from './backend/api/users.ts';
import { runAllTests } from './backend/tests/run_tests.ts';
import { requireAuth, AuthenticatedRequest } from './backend/auth/security.ts';

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'Document Understanding for Retrieval: Layout, Tables and Reading Order',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Mounted Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/users', usersRoutes);

// Test Runner API
app.post('/api/tests/run', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const summary = await runAllTests();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Document Understanding Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
