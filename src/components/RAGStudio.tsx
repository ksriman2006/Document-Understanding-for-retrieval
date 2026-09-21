import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Send,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Layers,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import { DocumentRecord, RAGQueryRecord, SearchResult } from '../types';
import { api } from '../api/client';

interface RAGStudioProps {
  documents: DocumentRecord[];
  initialQuestion?: string;
}

const SAMPLE_QUESTIONS = [
  'What was the profit in 2025?',
  'How does reading order affect multi-column retrieval?',
  'What is the formula for cosine similarity?',
  'What were the key departmental expenditures in 2025?',
  'What was the revenue and gross profit in 2024?',
  'Why do standard horizontal PDF scrapers break dual-column papers?',
];

export const RAGStudio: React.FC<RAGStudioProps> = ({
  documents,
  initialQuestion = '',
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<RAGQueryRecord | null>(null);
  const [searchChunks, setSearchChunks] = useState<SearchResult[]>([]);
  const [showChunks, setShowChunks] = useState(true);
  const [history, setHistory] = useState<RAGQueryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      handleAsk(initialQuestion);
    }
    loadHistory();
  }, [initialQuestion]);

  const loadHistory = async () => {
    try {
      const res = await api.getRAGHistory();
      setHistory(res.history);
    } catch (err) {
      console.warn('Could not load RAG history:', err);
    }
  };

  const handleAsk = async (qText?: string) => {
    const q = (qText || question).trim();
    if (!q) return;

    setError(null);
    setLoading(true);

    try {
      // 1. Fetch semantic search chunks for visual inspector
      const searchRes = await api.search(q, {
        topK: 4,
        documentId: selectedDocId !== 'all' ? selectedDocId : undefined,
      });
      setSearchChunks(searchRes.results);

      // 2. Execute grounded RAG query
      const ragRes = await api.askRAG(
        q,
        selectedDocId !== 'all' ? selectedDocId : undefined
      );
      setCurrentResult(ragRes);
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'RAG query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Structure-Aware Retrieval & Grounded RAG
            </h3>
            <p className="text-xs text-slate-400">
              Query vector embeddings with layout, reading order, and table-aware context synthesis
            </p>
          </div>
        </div>

        {/* Filter Document Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Search Scope:</label>
          <select
            id="rag-scope-selector"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 max-w-xs"
          >
            <option value="all">All Documents ({documents.length})</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.originalName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Query Input Box & Prompt Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="rag-query-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents, multi-column papers, or tables..."
              disabled={loading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            id="rag-ask-button"
            type="submit"
            disabled={loading || !question.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-sm shrink-0"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </>
            )}
          </button>
        </form>

        {/* Suggested Prompt Chips */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Suggested Verification Prompts:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuestion(chip);
                  handleAsk(chip);
                }}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-emerald-500/40 text-[11px] text-slate-300 transition-colors text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer & Citations Card */}
      {currentResult && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
          {/* Answer Header */}
          <div className="p-5 bg-emerald-950/20 border-b border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Grounded Model Answer</h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Model: {currentResult.modelUsed}</span>
            </div>
          </div>

          {/* Answer Text */}
          <div className="p-6 border-b border-slate-800 space-y-4">
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentResult.answer}
            </div>

            {/* Tables Used Notification */}
            {currentResult.tablesUsed && currentResult.tablesUsed.length > 0 && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center gap-2.5 text-xs text-blue-300">
                <TableIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Grounded with structured data from table{currentResult.tablesUsed.length === 1 ? '' : 's'}:{' '}
                  <strong className="font-mono">{currentResult.tablesUsed.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Citations Section */}
          <div className="p-5 bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Verified Source Citations ({currentResult.citations.length})</span>
            </div>

            {currentResult.citations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No direct citations available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentResult.citations.map((cit, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                        {cit.filename}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                        {(cit.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Page {cit.page}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{cit.section}</span>
                      {cit.tableId && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400 font-bold">{cit.tableId}</span>
                        </>
                      )}
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono line-clamp-3">
                      "{cit.snippet}..."
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retrieved Chunks Inspector */}
      {searchChunks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div
            onClick={() => setShowChunks(!showChunks)}
            className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-950"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Retrieved Vector Chunks Inspector ({searchChunks.length} chunks)</span>
            </div>
            <button className="text-slate-400">
              {showChunks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showChunks && (
            <div className="p-5 divide-y divide-slate-800 space-y-4">
              {searchChunks.map((res, i) => (
                <div key={res.chunk.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">#{i + 1}</span>
                      <span className="text-slate-200 font-semibold">{res.document.filename}</span>
                      <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        Page {res.chunk.page} • {res.chunk.chunkType}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      Cosine Sim: {res.similarity}
                    </span>
                  </div>

                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {res.chunk.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
