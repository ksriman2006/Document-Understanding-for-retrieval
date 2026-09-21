import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  Layers,
  Table as TableIcon,
  Sparkles,
  ArrowRight,
  Database,
  FileCheck,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import { api } from '../api/client';

interface DocumentLibraryProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectDocument: (doc: DocumentRecord, targetTab?: 'layout' | 'reading-order' | 'tables') => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  isLoading,
  onRefresh,
  onSelectDocument,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileUpload(e.target.files[0]);
    }
  };

  const processFileUpload = async (file: File) => {
    setError(null);
    setActionMsg(null);
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
      return;
    }

    if (file.size === 0) {
      setError('Uploaded file is empty (0 bytes).');
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadDocument(file);
      setActionMsg(`Uploaded ${file.name}. Pipeline processing initiated.`);
      onRefresh();
      // Poll progress shortly
      setTimeout(() => onRefresh(), 1500);
      setTimeout(() => onRefresh(), 4000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSeedSamples = async () => {
    setError(null);
    setSeeding(true);
    try {
      const res = await api.seedSamples();
      setActionMsg(res.message);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to seed sample documents');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and all extracted representations?')) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleReprocess = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await api.triggerProcess(docId);
      setActionMsg('Reprocessing pipeline queued.');
      onRefresh();
      setTimeout(() => onRefresh(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reprocess');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {actionMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner / Upload Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Drag & Drop Upload Zone */}
        <div
          id="dropzone-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:col-span-2 border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300'
              : 'border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900 text-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            {uploading ? 'Ingesting and analyzing document...' : 'Upload Document for Structure-Aware Retrieval'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-3">
            Drag and drop your PDF, DOCX, or TXT file here, or click to browse.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">PDF</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">DOCX</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">TXT</span>
            <span>(Max 25 MB)</span>
          </div>
        </div>

        {/* Quick Demo Benchmark Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Benchmark Datasets</span>
            </div>
            <h4 className="text-sm font-bold text-slate-100 mb-1.5">
              1-Click Academic Sample Corpus
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Instantly provisions 3 benchmark documents demonstrating:
              <br />• Dual-column research paper (reading order test)
              <br />• Annual financial audit with multi-year tables
              <br />• Technical architecture with mathematical formulas
            </p>
          </div>

          <button
            id="seed-benchmark-btn"
            onClick={handleSeedSamples}
            disabled={seeding}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {seeding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Benchmark Corpus...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Load Benchmark Documents</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Documents Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Document Repository</h3>
            <p className="text-xs text-slate-400">
              {documents.length} document{documents.length === 1 ? '' : 's'} indexed in isolated vector database
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh document status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-sm font-medium text-slate-300">No documents in your library yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload a document above or click "Load Benchmark Documents" to inspect layout analysis and reading order reconstruction.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((doc) => {
              const meta = doc.metadata || {};
              const isCompleted = doc.status === 'COMPLETED';
              const isProcessing = doc.status === 'PROCESSING';
              const isFailed = doc.status === 'FAILED';

              return (
                <div
                  key={doc.id}
                  id={`doc-row-${doc.id}`}
                  className="p-5 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-100 truncate max-w-md">
                          {doc.originalName}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {doc.fileType}
                        </span>
                        {/* Status Badge */}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {isProcessing && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Processing Pipeline...
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>

                      {/* Subtitle & Metadata Stats */}
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}</span>
                        {meta.isMultiColumn && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">Dual-Column Layout</span>
                          </>
                        )}
                        {meta.totalElements !== undefined && (
                          <>
                            <span>•</span>
                            <span>{meta.totalElements} elements</span>
                          </>
                        )}
                        {meta.detectedTablesCount !== undefined && meta.detectedTablesCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400 font-medium">{meta.detectedTablesCount} table{meta.detectedTablesCount === 1 ? '' : 's'}</span>
                          </>
                        )}
                        {meta.totalChunks !== undefined && (
                          <>
                            <span>•</span>
                            <span>{meta.totalChunks} chunks indexed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {isCompleted && (
                      <>
                        <button
                          id={`view-layout-${doc.id}`}
                          onClick={() => onSelectDocument(doc, 'layout')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          title="Inspect visual bounding boxes"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Layout</span>
                        </button>
                        <button
                          id={`view-reading-order-${doc.id}`}
                          onClick={() => onSelectDocument(doc, 'reading-order')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          title="Inspect reading order sequence"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reading Order</span>
                        </button>
                        {meta.detectedTablesCount !== undefined && meta.detectedTablesCount > 0 && (
                          <button
                            id={`view-tables-${doc.id}`}
                            onClick={() => onSelectDocument(doc, 'tables')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            title="View extracted tables"
                          >
                            <TableIcon className="w-3.5 h-3.5 text-blue-400" />
                            <span>Tables</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={(e) => handleReprocess(e, doc.id)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Re-run pipeline"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
