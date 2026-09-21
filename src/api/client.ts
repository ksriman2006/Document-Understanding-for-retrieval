import {
  User,
  DocumentRecord,
  DocumentElement,
  TableRecord,
  FormulaRecord,
  SearchResult,
  RAGQueryRecord,
  EvaluationMetrics,
  TestSummary,
} from '../types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('doc_retrieval_jwt');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async register(name: string, email: string, password: string): Promise<{ user: User; token: string; message: string }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return request('/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<{ user: User; stats: any }> {
    return request('/auth/me');
  },

  async getProfile(): Promise<{ user: User; stats: any; systemInfo: any }> {
    return request('/users/profile');
  },

  // Documents
  async getDocuments(): Promise<{ documents: DocumentRecord[] }> {
    return request('/documents');
  },

  async getDocument(id: string): Promise<{ document: DocumentRecord }> {
    return request(`/documents/${id}`);
  },

  async uploadDocument(file: File): Promise<{ document: DocumentRecord; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async seedSamples(): Promise<{ success: boolean; message: string; count: number }> {
    return request('/documents/seed-samples', { method: 'POST' });
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    return request(`/documents/${id}`, { method: 'DELETE' });
  },

  async getLayout(id: string): Promise<{ documentId: string; filename: string; elements: DocumentElement[] }> {
    return request(`/documents/${id}/layout`);
  },

  async getReadingOrder(id: string): Promise<{
    documentId: string;
    filename: string;
    isMultiColumn: boolean;
    naiveOrder: DocumentElement[];
    reconstructedOrder: DocumentElement[];
  }> {
    return request(`/documents/${id}/reading-order`);
  },

  async getTables(id: string): Promise<{ tables: TableRecord[] }> {
    return request(`/documents/${id}/tables`);
  },

  async getFormulas(id: string): Promise<{ formulas: FormulaRecord[] }> {
    return request(`/documents/${id}/formulas`);
  },

  async triggerProcess(id: string): Promise<{ message: string; status: string }> {
    return request(`/documents/${id}/process`, { method: 'POST' });
  },

  async getStatus(id: string): Promise<any> {
    return request(`/documents/${id}/status`);
  },

  // Search
  async search(query: string, options?: { topK?: number; documentId?: string }): Promise<{
    results: SearchResult[];
    queryVectorModel: string;
    latencyMs: number;
  }> {
    return request('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        topK: options?.topK ?? 5,
        documentId: options?.documentId,
      }),
    });
  },

  async getSearchHistory(): Promise<{ history: any[] }> {
    return request('/search/history');
  },

  // RAG
  async askRAG(question: string, documentId?: string): Promise<RAGQueryRecord> {
    return request('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ question, documentId }),
    });
  },

  async getRAGHistory(): Promise<{ history: RAGQueryRecord[] }> {
    return request('/rag/history');
  },

  // Evaluation
  async getEvaluation(): Promise<{ evaluation: EvaluationMetrics }> {
    return request('/evaluation');
  },

  async runEvaluation(): Promise<{ success: boolean; evaluation: EvaluationMetrics }> {
    return request('/evaluation/run', { method: 'POST' });
  },

  // Tests
  async runAutomatedTests(): Promise<TestSummary> {
    return request('/tests/run', { method: 'POST' });
  },
};
