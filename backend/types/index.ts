export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ElementType =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'image'
  | 'header'
  | 'footer'
  | 'page_number'
  | 'formula'
  | 'other';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  pageCount: number;
  status: DocumentStatus;
  errorMessage?: string;
  uploadedAt: string;
  processedAt?: string;
  filePath: string;
  metadata?: {
    author?: string;
    creationDate?: string;
    isMultiColumn?: boolean;
    columnsDetected?: number;
    detectedTablesCount?: number;
    detectedFormulasCount?: number;
    totalElements?: number;
    totalChunks?: number;
  };
}

export interface DocumentElement {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  type: ElementType;
  text: string;
  rawText?: string;
  boundingBox: BoundingBox;
  column: number;
  readingOrderIndex: number;
  naiveOrderIndex: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface TableRecord {
  id: string;
  tableId: string;
  documentId: string;
  userId: string;
  page: number;
  title: string;
  headers: string[];
  rows: string[][];
  markdown: string;
  searchableText: string;
  boundingBox: BoundingBox;
  readingOrderIndex: number;
}

export interface FormulaRecord {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  formula: string;
  formulaType: 'inline' | 'display' | 'equation';
  associatedSection?: string;
  boundingBox: BoundingBox;
  readingOrderIndex: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  section: string;
  chunkType: 'heading_paragraph' | 'section' | 'table_context' | 'list_group' | 'formula_block';
  content: string;
  elementIds: string[];
  tableId?: string;
  sourcePosition: {
    page: number;
    readingOrderStart: number;
    readingOrderEnd: number;
  };
}

export interface EmbeddingRecord {
  chunkId: string;
  documentId: string;
  userId: string;
  vector: number[];
  model: string;
  createdAt: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  document: {
    id: string;
    filename: string;
    fileType: string;
  };
  similarity: number;
  table?: TableRecord;
}

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  timestamp: string;
  resultsCount: number;
  latencyMs: number;
}

export interface RAGCitation {
  documentId: string;
  filename: string;
  page: number;
  section: string;
  tableId?: string;
  similarity: number;
  snippet: string;
  elementType: string;
}

export interface RAGQueryRecord {
  id: string;
  userId: string;
  question: string;
  answer: string;
  citations: RAGCitation[];
  tablesUsed?: string[];
  chunksUsedCount: number;
  timestamp: string;
  modelUsed: string;
}

export interface EvaluationMetrics {
  id: string;
  userId: string;
  timestamp: string;
  layout: {
    elementDetectionPrecision: number;
    elementDetectionRecall: number;
    f1Score: number;
    classificationAccuracy: number;
    testedElementsCount: number;
  };
  readingOrder: {
    sequenceCorrectness: number;
    kendallTauDistance: number;
    columnSeparationAccuracy: number;
    testedSequencesCount: number;
  };
  tables: {
    tableDetectionAccuracy: number;
    headerDetectionPrecision: number;
    rowExtractionAccuracy: number;
    cellValueAccuracy: number;
    testedTablesCount: number;
  };
  retrieval: {
    top1Accuracy: number;
    top3Accuracy: number;
    top5Accuracy: number;
    meanReciprocalRank: number;
    precisionAtK: number;
    recallAtK: number;
    testedQueriesCount: number;
  };
  rag: {
    answerRelevance: number;
    contextGrounding: number;
    hallucinationRate: number;
    sourceTraceability: number;
  };
  comparison: {
    naiveRAG: {
      retrievalAccuracy: number;
      tableRetrievalRate: number;
      readingOrderIntegrity: number;
      hallucinationRisk: number;
    };
    structureAwareRAG: {
      retrievalAccuracy: number;
      tableRetrievalRate: number;
      readingOrderIntegrity: number;
      hallucinationRisk: number;
    };
  };
}
