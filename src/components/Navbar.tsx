import React from 'react';
import {
  FileText,
  Layers,
  ArrowDownUp,
  Table as TableIcon,
  Search,
  BarChart3,
  TestTube2,
  User as UserIcon,
  LogOut,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'library'
  | 'layout'
  | 'reading-order'
  | 'tables'
  | 'rag'
  | 'evaluation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenTests: () => void;
  onOpenAuth: () => void;
  documentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTests,
  onOpenAuth,
  documentCount,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'library', label: 'Documents & Upload', icon: <FileText className="w-4 h-4" />, badge: documentCount },
    { id: 'layout', label: 'Layout Understanding', icon: <Layers className="w-4 h-4" /> },
    { id: 'reading-order', label: 'Reading Order', icon: <ArrowDownUp className="w-4 h-4" /> },
    { id: 'tables', label: 'Tables & Cells', icon: <TableIcon className="w-4 h-4" /> },
    { id: 'rag', label: 'Search & Ask AI', icon: <Search className="w-4 h-4" /> },
    { id: 'evaluation', label: 'Evaluation & Benchmarks', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-100 text-base">
                  DocRetriever AI
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Full-Stack Live
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Layout, Tables & Reading Order for High-Precision RAG
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            <button
              id="test-suite-btn"
              onClick={onOpenTests}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Run 13 automated backend tests"
            >
              <TestTube2 className="w-3.5 h-3.5" />
              <span>Run Automated Tests</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>
                <button
                  id="user-account-btn"
                  onClick={onOpenAuth}
                  className="w-8 h-8 rounded-full bg-emerald-700/40 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-bold hover:bg-emerald-600/40 transition-colors"
                  title="Switch or manage account"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                <button
                  id="logout-btn"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-trigger-btn"
                onClick={onOpenAuth}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
