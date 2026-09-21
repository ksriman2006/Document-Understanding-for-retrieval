export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

export type ElementType =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'table'
  | 'formula'
  | 'list'
  | 'header'
  | 'footer'
  | 'page_number'
  | 'caption';

export interface DocumentElement {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  type: ElementType;
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  column?: number;
  naiveOrderIndex: number;
  readingOrderIndex: number;
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
  boundingBox?: BoundingBox;
  readingOrderIndex?: number;
}

export interface FormulaRecord {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  formula: string;
  formulaType: 'inline' | 'display';
  associatedSection: string;
  boundingBox?: BoundingBox;
  readingOrderIndex?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  page: number;
  section: string;
  chunkType: 'heading_paragraph' | 'section' | 'table_context' | 'list_group';
  content: string;
  elementIds: string[];
  tableId?: string;
  sourcePosition: {
    page: number;
    readingOrderStart: number;
    readingOrderEnd: number;
  };
}

export interface DocumentRecord {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  pageCount: number;
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedAt: string;
  processedAt?: string;
  errorMessage?: string;
  metadata?: {
    isMultiColumn?: boolean;
    columnsDetected?: number;
    detectedTablesCount?: number;
    detectedFormulasCount?: number;
    totalElements?: number;
    totalChunks?: number;
  };
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

export interface RAGCitation {
  documentId: string;
  filename: string;
  page: number;
  section: string;
  tableId?: string;
  similarity: number;
  snippet: string;
  elementType?: string;
}

export interface RAGQueryRecord {
  id: string;
  userId: string;
  question: string;
  answer: string;
  citations: RAGCitation[];
  tablesUsed: string[];
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

export interface TestResultItem {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
}
