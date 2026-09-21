import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Play, RefreshCw, TestTube2, Clock } from 'lucide-react';
import { api } from '../api/client';
import { TestSummary } from '../types';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runAutomatedTests();
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to run test suite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <TestTube2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Automated Backend Test Suite</h2>
              <p className="text-xs text-slate-400">
                Unit, extraction, layout, reading order, table & RAG verification
              </p>
            </div>
          </div>
          <button
            id="close-test-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Status Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="execute-tests-btn"
              onClick={runTests}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{summary ? 'Re-run Tests' : 'Run Full Suite'}</span>
                </>
              )}
            </button>

            {summary && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {summary.passed} Passed
                </span>
                {summary.failed > 0 && (
                  <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                    {summary.failed} Failed
                  </span>
                )}
              </div>
            )}
          </div>

          <span className="text-xs text-slate-500 font-mono">13 Test Modules</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300">
              {error}
            </div>
          )}

          {!summary && !loading && !error && (
            <div className="py-12 text-center text-slate-400">
              <TestTube2 className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-60" />
              <p className="text-sm font-medium text-slate-300">Click "Run Full Suite" to execute backend verification</p>
              <p className="text-xs text-slate-500 mt-1">
                Validates Auth, PDF/DOCX/TXT extraction, Layout BBoxes, Reading Order, Table parsing, Embeddings, and RAG.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300 font-medium">Running integration test assertions...</p>
            </div>
          )}

          {summary &&
            summary.results.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  item.passed
                    ? 'bg-slate-800/40 border-slate-700/60 text-slate-200'
                    : 'bg-red-950/20 border-red-800/40 text-red-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-semibold leading-snug">{item.name}</h4>
                    {item.error && (
                      <p className="text-[11px] text-red-400 mt-1 font-mono">{item.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{item.durationMs}ms</span>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Target Environment: Node.js / Express + TypeScript</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
