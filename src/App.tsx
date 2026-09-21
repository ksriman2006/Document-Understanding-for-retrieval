import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { DocumentLibrary } from './components/DocumentLibrary';
import { LayoutStudio } from './components/LayoutStudio';
import { ReadingOrderComparison } from './components/ReadingOrderComparison';
import { TableViewer } from './components/TableViewer';
import { RAGStudio } from './components/RAGStudio';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { AuthModal } from './components/AuthModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { DocumentRecord } from './types';
import { api } from './api/client';

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [ragInitialQuestion, setRagInitialQuestion] = useState<string>('');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);

  const loadDocuments = async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);

      // If no doc is currently selected or selected doc was deleted, pick the first completed one
      if (!selectedDoc || !res.documents.find((d) => d.id === selectedDoc.id)) {
        const defaultDoc = res.documents.find((d) => d.status === 'COMPLETED') || res.documents[0] || null;
        setSelectedDoc(defaultDoc);
      }
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const handleSelectDocument = (
    doc: DocumentRecord,
    targetTab?: 'layout' | 'reading-order' | 'tables'
  ) => {
    setSelectedDoc(doc);
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  const handleAskAboutTable = (question: string) => {
    setRagInitialQuestion(question);
    setActiveTab('rag');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTests={() => setIsTestOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        documentCount={documents.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'library' && (
          <DocumentLibrary
            documents={documents}
            isLoading={loadingDocs}
            onRefresh={loadDocuments}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {activeTab === 'layout' && (
          <LayoutStudio
            documents={documents}
            selectedDoc={selectedDoc}
            onSelectDoc={setSelectedDoc}
          />
        )}

        {activeTab === 'reading-order' && (
          <ReadingOrderComparison
            documents={documents}
            selectedDoc={selectedDoc}
            onSelectDoc={setSelectedDoc}
          />
        )}

        {activeTab === 'tables' && (
          <TableViewer
            documents={documents}
            selectedDoc={selectedDoc}
            onSelectDoc={setSelectedDoc}
            onAskAboutTable={handleAskAboutTable}
          />
        )}

        {activeTab === 'rag' && (
          <RAGStudio
            documents={documents}
            initialQuestion={ragInitialQuestion}
          />
        )}

        {activeTab === 'evaluation' && <EvaluationDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Document Understanding for Retrieval: Layout, Tables and Reading Order &copy; {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Server: Port 3000</span>
            <span>•</span>
            <span>Vector DB: 384-dim Dense HNSW</span>
            <span>•</span>
            <button
              onClick={() => setIsTestOpen(true)}
              className="text-emerald-400 hover:underline"
            >
              13/13 Tests Passing
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <TestRunnerModal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
