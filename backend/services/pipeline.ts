import { db } from '../database/db.ts';
import { extractDocumentContent } from '../extraction/extractor.ts';
import { analyzeDocumentLayout } from '../layout/analyzer.ts';
import { reconstructReadingOrder } from '../reading_order/reconstructor.ts';
import { extractTablesFromElements } from '../tables/extractor.ts';
import { extractFormulasFromElements } from '../formulas/extractor.ts';
import { createStructureAwareChunks } from '../chunking/chunker.ts';
import { generateBatchEmbeddings } from '../embeddings/service.ts';
import { vectorStore } from '../vector_store/store.ts';
import { DocumentRecord } from '../types/index.ts';

export interface PipelineStageLog {
  stage: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  message: string;
  timestamp: string;
  durationMs?: number;
}

export async function processDocumentPipeline(
  documentId: string,
  userId: string,
  onProgress?: (stage: string, status: string, details?: any) => void
): Promise<{ success: boolean; document: DocumentRecord; error?: string }> {
  const doc = db.getDocumentById(documentId, userId);
  if (!doc) {
    throw new Error('Document not found or access denied');
  }

  const startTime = Date.now();
  db.updateDocument(documentId, { status: 'PROCESSING', errorMessage: undefined });

  try {
    // Stage 1: Content Extraction
    onProgress?.('EXTRACTION', 'RUNNING');
    const extractionResult = await extractDocumentContent(doc.filePath, doc.fileType);
    onProgress?.('EXTRACTION', 'SUCCESS', {
      pages: extractionResult.pageCount,
      blocks: extractionResult.blocks.length,
    });

    // Stage 2: Layout Analysis
    onProgress?.('LAYOUT_ANALYSIS', 'RUNNING');
    const layoutResult = analyzeDocumentLayout(documentId, userId, extractionResult.blocks);
    onProgress?.('LAYOUT_ANALYSIS', 'SUCCESS', {
      elementsCount: layoutResult.elements.length,
      isMultiColumn: layoutResult.isMultiColumn,
    });

    // Stage 3: Reading Order Reconstruction
    onProgress?.('READING_ORDER', 'RUNNING');
    const readingOrderResult = reconstructReadingOrder(layoutResult.elements, layoutResult.isMultiColumn);
    db.setElements(documentId, readingOrderResult.elements);
    onProgress?.('READING_ORDER', 'SUCCESS', {
      reorderedCount: readingOrderResult.reorderedCount,
      scrambledPairsFixed: readingOrderResult.scrambledPairsCount,
    });

    // Stage 4: Table Understanding & Extraction
    onProgress?.('TABLE_EXTRACTION', 'RUNNING');
    const tables = extractTablesFromElements(documentId, userId, readingOrderResult.elements);
    db.setTables(documentId, tables);
    onProgress?.('TABLE_EXTRACTION', 'SUCCESS', {
      tablesDetected: tables.length,
    });

    // Stage 5: Formula Extraction
    onProgress?.('FORMULA_EXTRACTION', 'RUNNING');
    const formulas = extractFormulasFromElements(documentId, userId, readingOrderResult.elements);
    db.setFormulas(documentId, formulas);
    onProgress?.('FORMULA_EXTRACTION', 'SUCCESS', {
      formulasDetected: formulas.length,
    });

    // Stage 6: Structure-Aware Chunking
    onProgress?.('CHUNKING', 'RUNNING');
    const chunks = createStructureAwareChunks(documentId, userId, readingOrderResult.elements, tables);
    db.setChunks(documentId, chunks);
    onProgress?.('CHUNKING', 'SUCCESS', {
      chunksCreated: chunks.length,
    });

    // Stage 7: Semantic Embeddings Generation
    onProgress?.('EMBEDDINGS', 'RUNNING');
    const embeddings = await generateBatchEmbeddings(chunks);
    onProgress?.('EMBEDDINGS', 'SUCCESS', {
      embeddingsGenerated: embeddings.length,
    });

    // Stage 8: Vector Database Indexing
    onProgress?.('VECTOR_INDEXING', 'RUNNING');
    vectorStore.insertEmbeddings(documentId, embeddings);
    onProgress?.('VECTOR_INDEXING', 'SUCCESS', {
      indexedCount: embeddings.length,
    });

    // Update document status to COMPLETED
    const updatedDoc = db.updateDocument(documentId, {
      status: 'COMPLETED',
      pageCount: extractionResult.pageCount,
      processedAt: new Date().toISOString(),
      metadata: {
        isMultiColumn: layoutResult.isMultiColumn,
        columnsDetected: layoutResult.columnCount,
        detectedTablesCount: tables.length,
        detectedFormulasCount: formulas.length,
        totalElements: readingOrderResult.elements.length,
        totalChunks: chunks.length,
      },
    })!;

    return { success: true, document: updatedDoc };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown processing error';
    console.error(`Pipeline failed for document ${documentId}:`, err);
    const updatedDoc = db.updateDocument(documentId, {
      status: 'FAILED',
      errorMessage: errorMsg,
    })!;
    return { success: false, document: updatedDoc, error: errorMsg };
  }
}
