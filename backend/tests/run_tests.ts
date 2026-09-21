import { db } from '../database/db.ts';
import { hashPassword, verifyPassword, generateToken } from '../auth/security.ts';
import { extractDocumentContent } from '../extraction/extractor.ts';
import { analyzeDocumentLayout } from '../layout/analyzer.ts';
import { reconstructReadingOrder } from '../reading_order/reconstructor.ts';
import { extractTablesFromElements } from '../tables/extractor.ts';
import { extractFormulasFromElements } from '../formulas/extractor.ts';
import { createStructureAwareChunks } from '../chunking/chunker.ts';
import { generateEmbedding, generateBatchEmbeddings, generateLocalDenseEmbedding } from '../embeddings/service.ts';
import { vectorStore, cosineSimilarity } from '../vector_store/store.ts';
import { retrieveRelevantContext } from '../retrieval/engine.ts';
import { executeRAGQuery } from '../rag/service.ts';
import { runComprehensiveEvaluation } from '../evaluation/evaluator.ts';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runAllTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('Document Understanding for Retrieval: Layout, Tables, Reading Order');
  console.log('============================================================\n');

  const testUserId = `test_usr_${Date.now()}`;
  const testDocId = `test_doc_${Date.now()}`;

  // 1. Auth & Password Hashing
  await test('Auth: Password hashing and verification', async () => {
    const raw = 'SecretPassword123!';
    const hashed = await hashPassword(raw);
    assert(hashed !== raw, 'Password must be hashed and salted');
    const isValid = await verifyPassword(raw, hashed);
    assert(isValid, 'Password verification must return true for correct password');
    const isInvalid = await verifyPassword('WrongPassword', hashed);
    assert(!isInvalid, 'Password verification must return false for wrong password');
  });

  // 2. JWT Generation & User Creation
  await test('Auth: User creation and JWT token signing', () => {
    const user = db.createUser({
      id: testUserId,
      name: 'Dr. Turing',
      email: `turing_${Date.now()}@example.edu`,
      passwordHash: 'hashed',
      createdAt: new Date().toISOString(),
    });
    assert(user.id === testUserId, 'User ID must match');
    const token = generateToken(user);
    assert(typeof token === 'string' && token.length > 20, 'JWT token must be non-empty string');
  });

  // 3. Document Extraction (TXT & Multi-paragraph)
  const sampleFilePath = path.resolve(process.cwd(), 'data', `test_sample_${Date.now()}.txt`);
  const sampleContent = `RESEARCH REPORT ON DOCUMENT RETRIEVAL\n\n1. Introduction\nDocument layout analysis preserves table structure.\n\nTable 1: Financial Benchmarks\n| Year | Revenue | Profit |\n| 2024 | $100M | $20M |\n| 2025 | $120M | $30M |\n\n2. Formulation\nFormula 1: Cosine distance\nE = mc^2\n\n[Column 2]\n3. Experimental Results\nResults confirm reading order restoration prevents context scrambles.`;

  await test('Extraction: TXT document parsing and block generation', async () => {
    fs.writeFileSync(sampleFilePath, sampleContent, 'utf-8');
    const extracted = await extractDocumentContent(sampleFilePath, 'txt');
    assert(extracted.pageCount >= 1, 'Extracted page count must be >= 1');
    assert(extracted.blocks.length >= 4, 'Blocks count must be >= 4');
  });

  // 4. Layout Detection
  let extractedBlocks: any[] = [];
  await test('Layout Analysis: Element classification and bounding boxes', async () => {
    const extracted = await extractDocumentContent(sampleFilePath, 'txt');
    extractedBlocks = extracted.blocks;
    const layout = analyzeDocumentLayout(testDocId, testUserId, extractedBlocks);

    assert(layout.elements.length > 0, 'Elements array must not be empty');
    const types = new Set(layout.elements.map((e) => e.type));
    assert(types.has('title'), 'Should detect title');
    assert(types.has('heading'), 'Should detect headings');
    assert(types.has('table'), 'Should detect tables');
    assert(types.has('formula'), 'Should detect formula');
  });

  // 5. Reading Order Reconstruction
  let layoutElements: any[] = [];
  await test('Reading Order: Reconstruct sequence across columns', () => {
    const layout = analyzeDocumentLayout(testDocId, testUserId, extractedBlocks);
    layoutElements = layout.elements;
    const reordered = reconstructReadingOrder(layoutElements, true);

    assert(reordered.elements.length === layoutElements.length, 'Element count must be preserved');
    assert(reordered.elements[0].readingOrderIndex === 1, 'First element reading order index must be 1');
    assert(reordered.columnsDetected >= 1, 'Columns must be detected');
  });

  // 6. Table Extraction & Cell Relationships
  let tables: any[] = [];
  await test('Table Understanding: Detect boundaries, headers and rows', () => {
    tables = extractTablesFromElements(testDocId, testUserId, layoutElements);
    assert(tables.length >= 1, 'Must detect at least 1 table');
    const t1 = tables[0];
    assert(t1.headers.length >= 3, 'Must extract headers: Year, Revenue, Profit');
    assert(t1.rows.length >= 2, 'Must extract at least 2 data rows');
    assert(t1.markdown.includes('| Year |'), 'Markdown must format table');
    assert(t1.searchableText.includes('2025'), 'Searchable text must contain cell values');
  });

  // 7. Formula Handling
  await test('Formulas: Preserve equations without silent deletion', () => {
    const formulas = extractFormulasFromElements(testDocId, testUserId, layoutElements);
    assert(formulas.length >= 1, 'Must detect mathematical formulas');
  });

  // 8. Structure-Aware Chunking
  let chunks: any[] = [];
  await test('Chunking: Create structure-aware chunks with section context', () => {
    chunks = createStructureAwareChunks(testDocId, testUserId, layoutElements, tables);
    assert(chunks.length >= 2, 'Chunks count must be >= 2');
    const tableChunk = chunks.find((c) => c.chunkType === 'table_context');
    assert(Boolean(tableChunk), 'Must create dedicated table context chunk');
    assert(tableChunk.content.includes('Table'), 'Table chunk must contain markdown data');
  });

  // 9. Semantic Embeddings & Vector Operations
  await test('Embeddings: Generate dense normalized vectors', async () => {
    const vec1 = generateLocalDenseEmbedding('Financial revenue and profit in 2025');
    const vec2 = generateLocalDenseEmbedding('2025 financial profit earnings');
    const vec3 = generateLocalDenseEmbedding('Quantum mechanics particle wave duality');

    assert(vec1.length === 384, 'Vector dimension must be 384');
    const simHigh = cosineSimilarity(vec1, vec2);
    const simLow = cosineSimilarity(vec1, vec3);
    assert(simHigh > simLow, 'Similar texts must have higher cosine similarity');
  });

  // 10. Vector Database Indexing & Search
  await test('Vector Database: Index chunks and perform similarity search', async () => {
    const embeddings = await generateBatchEmbeddings(chunks);
    vectorStore.insertEmbeddings(testDocId, embeddings);
    db.setChunks(testDocId, chunks);

    const results = vectorStore.search(testUserId, embeddings[0].vector, 3);
    assert(results.length > 0, 'Vector search must return matching results');
    assert(results[0].chunk.documentId === testDocId, 'Result must belong to test document');
  });

  // 11. Semantic Retrieval with Table Boosting
  await test('Retrieval: Query routing and tabular question retrieval', async () => {
    db.createDocument({
      id: testDocId,
      userId: testUserId,
      filename: 'financial_test.txt',
      originalName: 'Financial Test Report',
      fileType: 'txt',
      fileSize: 1024,
      pageCount: 1,
      status: 'COMPLETED',
      uploadedAt: new Date().toISOString(),
      filePath: sampleFilePath,
    });

    const retrieval = await retrieveRelevantContext(testUserId, 'What was the profit in 2025?');
    assert(retrieval.results.length > 0, 'Retrieval must return relevant context');
    assert(retrieval.results.some((r) => r.chunk.content.includes('Profit') || r.table), 'Must retrieve table data');
  });

  // 12. RAG + Grounded LLM
  await test('RAG: Grounded answer generation with source citations', async () => {
    const rag = await executeRAGQuery(testUserId, 'What was the profit in 2025?');
    assert(rag.answer.length > 0, 'RAG answer must not be empty');
    assert(rag.citations.length > 0, 'RAG must include source citations');
    assert(rag.answer.includes('$30M') || rag.answer.includes('30'), 'Answer must extract correct table cell value');
  });

  // 13. Evaluation Framework
  await test('Evaluation: Quantitative benchmark calculation', () => {
    const evalResults = runComprehensiveEvaluation(testUserId);
    assert(evalResults.layout.classificationAccuracy > 0.8, 'Layout accuracy must be > 80%');
    assert(evalResults.readingOrder.kendallTauDistance > 0.8, 'Kendall Tau correlation must be > 0.8');
    assert(evalResults.tables.cellValueAccuracy > 0.9, 'Table cell accuracy must be > 90%');
    assert(evalResults.comparison.structureAwareRAG.retrievalAccuracy > evalResults.comparison.naiveRAG.retrievalAccuracy, 'Structure-aware RAG must outperform naive RAG');
  });

  // Cleanup temporary file
  try {
    fs.unlinkSync(sampleFilePath);
  } catch (e) {}

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log('\n------------------------------------------------------------');
  console.log(`TEST SUMMARY: ${passedCount}/${results.length} PASSED (${failedCount} failed)`);
  console.log('------------------------------------------------------------\n');

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

// If executed directly from CLI: `tsx backend/tests/run_tests.ts`
if (process.argv[1] && process.argv[1].endsWith('run_tests.ts')) {
  runAllTests()
    .then((summary) => {
      if (summary.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
