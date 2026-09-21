import fs from 'fs';
import path from 'path';
import {
  User,
  DocumentRecord,
  DocumentElement,
  TableRecord,
  FormulaRecord,
  DocumentChunk,
  EmbeddingRecord,
  SearchHistoryRecord,
  RAGQueryRecord,
  EvaluationMetrics,
} from '../types/index.ts';

interface DatabaseSchema {
  users: User[];
  documents: DocumentRecord[];
  elements: DocumentElement[];
  tables: TableRecord[];
  formulas: FormulaRecord[];
  chunks: DocumentChunk[];
  embeddings: EmbeddingRecord[];
  searchHistory: SearchHistoryRecord[];
  ragQueries: RAGQueryRecord[];
  evaluations: EvaluationMetrics[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');
const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

class Database {
  private data: DatabaseSchema = {
    users: [],
    documents: [],
    elements: [],
    tables: [],
    formulas: [],
    chunks: [],
    embeddings: [],
    searchHistory: [],
    ragQueries: [],
    evaluations: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.documents = this.data.documents || [];
        this.data.elements = this.data.elements || [];
        this.data.tables = this.data.tables || [];
        this.data.formulas = this.data.formulas || [];
        this.data.chunks = this.data.chunks || [];
        this.data.embeddings = this.data.embeddings || [];
        this.data.searchHistory = this.data.searchHistory || [];
        this.data.ragQueries = this.data.ragQueries || [];
        this.data.evaluations = this.data.evaluations || [];
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  // User Operations
  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Document Operations
  getDocuments(userId: string): DocumentRecord[] {
    return this.data.documents.filter((d) => d.userId === userId);
  }

  getDocumentById(id: string, userId?: string): DocumentRecord | undefined {
    const doc = this.data.documents.find((d) => d.id === id);
    if (!doc) return undefined;
    if (userId && doc.userId !== userId) return undefined;
    return doc;
  }

  createDocument(doc: DocumentRecord): DocumentRecord {
    this.data.documents.push(doc);
    this.save();
    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    const doc = this.data.documents.find((d) => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates);
    this.save();
    return doc;
  }

  deleteDocument(id: string, userId: string): boolean {
    const docIndex = this.data.documents.findIndex((d) => d.id === id && d.userId === userId);
    if (docIndex === -1) return false;
    const doc = this.data.documents[docIndex];
    this.data.documents.splice(docIndex, 1);

    // Delete associated elements, tables, formulas, chunks, embeddings
    this.data.elements = this.data.elements.filter((e) => e.documentId !== id);
    this.data.tables = this.data.tables.filter((t) => t.documentId !== id);
    this.data.formulas = this.data.formulas.filter((f) => f.documentId !== id);
    this.data.chunks = this.data.chunks.filter((c) => c.documentId !== id);
    this.data.embeddings = this.data.embeddings.filter((em) => em.documentId !== id);

    // Cleanup physical file if exists
    try {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (e) {
      console.warn('Could not remove file:', doc.filePath);
    }

    this.save();
    return true;
  }

  // Elements Operations
  getElements(documentId: string, userId: string): DocumentElement[] {
    return this.data.elements
      .filter((e) => e.documentId === documentId && e.userId === userId)
      .sort((a, b) => a.readingOrderIndex - b.readingOrderIndex);
  }

  setElements(documentId: string, elements: DocumentElement[]): void {
    this.data.elements = this.data.elements.filter((e) => e.documentId !== documentId);
    this.data.elements.push(...elements);
    this.save();
  }

  // Tables Operations
  getTables(documentId?: string, userId?: string): TableRecord[] {
    return this.data.tables.filter((t) => {
      if (documentId && t.documentId !== documentId) return false;
      if (userId && t.userId !== userId) return false;
      return true;
    });
  }

  setTables(documentId: string, tables: TableRecord[]): void {
    this.data.tables = this.data.tables.filter((t) => t.documentId !== documentId);
    this.data.tables.push(...tables);
    this.save();
  }

  // Formulas Operations
  getFormulas(documentId: string, userId: string): FormulaRecord[] {
    return this.data.formulas.filter((f) => f.documentId === documentId && f.userId === userId);
  }

  setFormulas(documentId: string, formulas: FormulaRecord[]): void {
    this.data.formulas = this.data.formulas.filter((f) => f.documentId !== documentId);
    this.data.formulas.push(...formulas);
    this.save();
  }

  // Chunks Operations
  getChunks(documentId?: string, userId?: string): DocumentChunk[] {
    return this.data.chunks.filter((c) => {
      if (documentId && c.documentId !== documentId) return false;
      if (userId && c.userId !== userId) return false;
      return true;
    });
  }

  setChunks(documentId: string, chunks: DocumentChunk[]): void {
    this.data.chunks = this.data.chunks.filter((c) => c.documentId !== documentId);
    this.data.chunks.push(...chunks);
    this.save();
  }

  // Embeddings Operations
  getEmbeddings(userId: string): EmbeddingRecord[] {
    return this.data.embeddings.filter((e) => e.userId === userId);
  }

  setEmbeddings(documentId: string, embeddings: EmbeddingRecord[]): void {
    this.data.embeddings = this.data.embeddings.filter((e) => e.documentId !== documentId);
    this.data.embeddings.push(...embeddings);
    this.save();
  }

  // Search History Operations
  getSearchHistory(userId: string, limit = 10): SearchHistoryRecord[] {
    return this.data.searchHistory
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  addSearchHistory(record: SearchHistoryRecord): void {
    this.data.searchHistory.push(record);
    this.save();
  }

  // RAG Queries Operations
  getRAGQueries(userId: string, limit = 10): RAGQueryRecord[] {
    return this.data.ragQueries
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  addRAGQuery(query: RAGQueryRecord): void {
    this.data.ragQueries.push(query);
    this.save();
  }

  // Evaluation Operations
  getLatestEvaluation(userId: string): EvaluationMetrics | undefined {
    const userEvals = this.data.evaluations.filter((e) => e.userId === userId);
    return userEvals[userEvals.length - 1];
  }

  saveEvaluation(metrics: EvaluationMetrics): void {
    this.data.evaluations.push(metrics);
    this.save();
  }

  // Stats for user
  getUserStats(userId: string) {
    const docs = this.data.documents.filter((d) => d.userId === userId);
    const processedDocs = docs.filter((d) => d.status === 'COMPLETED');
    const failedDocs = docs.filter((d) => d.status === 'FAILED');
    const tables = this.data.tables.filter((t) => t.userId === userId);
    const elements = this.data.elements.filter((e) => e.userId === userId);
    const chunks = this.data.chunks.filter((c) => c.userId === userId);
    const embeddings = this.data.embeddings.filter((e) => e.userId === userId);

    return {
      totalDocuments: docs.length,
      processedDocuments: processedDocs.length,
      failedDocuments: failedDocs.length,
      tablesDetected: tables.length,
      documentElements: elements.length,
      chunksCreated: chunks.length,
      indexedVectors: embeddings.length,
    };
  }
}

export const db = new Database();
export { UPLOADS_DIR };
