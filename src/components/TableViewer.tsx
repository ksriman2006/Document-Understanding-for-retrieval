import React, { useState, useEffect } from 'react';
import {
  Table as TableIcon,
  Code,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { DocumentRecord, TableRecord } from '../types';
import { api } from '../api/client';

interface TableViewerProps {
  documents: DocumentRecord[];
  selectedDoc: DocumentRecord | null;
  onSelectDoc: (doc: DocumentRecord) => void;
  onAskAboutTable: (question: string) => void;
}

export const TableViewer: React.FC<TableViewerProps> = ({
  documents,
  selectedDoc,
  onSelectDoc,
  onAskAboutTable,
}) => {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [activeViewMode, setActiveViewMode] = useState<'grid' | 'markdown' | 'json' | 'searchable'>('grid');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      loadTables(selectedDoc.id);
    }
  }, [selectedDoc]);

  const loadTables = async (docId: string) => {
    setLoading(true);
    try {
      const res = await api.getTables(docId);
      setTables(res.tables);
      setSelectedTableIndex(0);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeTable = tables[selectedTableIndex] || null;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <TableIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Table Understanding & Structural Representation
            </h3>
            <p className="text-xs text-slate-400">
              Preserves 2D cell relationships, headers, Markdown, and searchable vector formats
            </p>
          </div>
        </div>

        {/* Document Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Active Document:</label>
          <select
            id="table-doc-selector"
            value={selectedDoc?.id || ''}
            onChange={(e) => {
              const doc = documents.find((d) => d.id === e.target.value);
              if (doc) onSelectDoc(doc);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 max-w-xs truncate"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.originalName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tables.length === 0 && !loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
          <p className="text-sm font-medium text-slate-300">No tables detected in this document</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Switch to the "Corporate Financial Report 2024-2025" benchmark document to see multi-year financial tables with profit and revenue metrics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tables Catalog (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Detected Tables ({tables.length})
            </div>

            <div className="space-y-2.5">
              {tables.map((tbl, idx) => {
                const isSelected = idx === selectedTableIndex;
                return (
                  <div
                    key={tbl.id}
                    id={`table-card-${tbl.tableId}`}
                    onClick={() => setSelectedTableIndex(idx)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500/80 ring-2 ring-blue-500/20 text-white'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {tbl.tableId}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Page {tbl.page}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold leading-snug line-clamp-2">
                      {tbl.title}
                    </h4>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{tbl.headers.length} Columns</span>
                      <span>•</span>
                      <span>{tbl.rows.length} Rows</span>
                      <span>•</span>
                      <span>{tbl.headers.length * tbl.rows.length} Cells</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Table Representations (8 cols) */}
          {activeTable && (
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {/* Table Title & Quick AI Trigger */}
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {activeTable.tableId}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">Page {activeTable.page}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{activeTable.title}</h3>
                </div>

                <button
                  id="ask-ai-table-btn"
                  onClick={() => onAskAboutTable(`What was the profit in 2025 according to ${activeTable.tableId}?`)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-center"
                  title="Ask RAG to answer questions based on this table"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ask AI About This Table</span>
                </button>
              </div>

              {/* View Mode Tabs */}
              <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center gap-2">
                <button
                  onClick={() => setActiveViewMode('grid')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeViewMode === 'grid'
                      ? 'bg-slate-800 text-blue-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Interactive Grid</span>
                </button>
                <button
                  onClick={() => setActiveViewMode('markdown')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeViewMode === 'markdown'
                      ? 'bg-slate-800 text-blue-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Markdown View</span>
                </button>
                <button
                  onClick={() => setActiveViewMode('json')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeViewMode === 'json'
                      ? 'bg-slate-800 text-blue-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Structured JSON</span>
                </button>
                <button
                  onClick={() => setActiveViewMode('searchable')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeViewMode === 'searchable'
                      ? 'bg-slate-800 text-blue-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Searchable Vector Text</span>
                </button>
              </div>

              {/* View Mode Contents */}
              <div className="p-5 flex-1 overflow-x-auto">
                {activeViewMode === 'grid' && (
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700">
                          {activeTable.headers.map((h, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 font-semibold text-slate-200 uppercase tracking-wider text-[11px]"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {activeTable.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-slate-800/40 transition-colors odd:bg-slate-900 even:bg-slate-900/50"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-4 py-3 text-slate-300 font-mono text-xs"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeViewMode === 'markdown' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">
                      Standard Markdown table passed directly to LLM context:
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre">
                      {activeTable.markdown}
                    </pre>
                  </div>
                )}

                {activeViewMode === 'json' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">
                      Clean JSON schema for database storage & tool calling:
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre max-h-[450px]">
                      {JSON.stringify(
                        {
                          table_id: activeTable.tableId,
                          page: activeTable.page,
                          title: activeTable.title,
                          headers: activeTable.headers,
                          rows: activeTable.rows,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}

                {activeViewMode === 'searchable' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">
                      Linearized natural-language row representation indexed by the vector search engine:
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {activeTable.searchableText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
