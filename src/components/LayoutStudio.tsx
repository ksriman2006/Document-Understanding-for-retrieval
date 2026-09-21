import React, { useState, useEffect } from 'react';
import {
  Layers,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Table as TableIcon,
  Sigma,
  FileText,
  ListOrdered,
  Filter,
} from 'lucide-react';
import { DocumentRecord, DocumentElement, ElementType } from '../types';
import { api } from '../api/client';

interface LayoutStudioProps {
  documents: DocumentRecord[];
  selectedDoc: DocumentRecord | null;
  onSelectDoc: (doc: DocumentRecord) => void;
}

const ELEMENT_TYPE_COLORS: Record<ElementType, { bg: string; border: string; text: string; label: string }> = {
  title: { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-400', label: 'Title' },
  heading: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', label: 'Heading' },
  subheading: { bg: 'bg-teal-500/20', border: 'border-teal-500', text: 'text-teal-400', label: 'Subheading' },
  paragraph: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', label: 'Paragraph' },
  table: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', label: 'Table' },
  formula: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', label: 'Formula' },
  list: { bg: 'bg-cyan-500/15', border: 'border-cyan-500', text: 'text-cyan-400', label: 'List Item' },
  header: { bg: 'bg-slate-500/15', border: 'border-slate-500', text: 'text-slate-400', label: 'Header' },
  footer: { bg: 'bg-slate-500/15', border: 'border-slate-500', text: 'text-slate-400', label: 'Footer' },
  page_number: { bg: 'bg-slate-600/15', border: 'border-slate-600', text: 'text-slate-400', label: 'Page Number' },
  caption: { bg: 'bg-rose-500/15', border: 'border-rose-500', text: 'text-rose-400', label: 'Caption' },
};

export const LayoutStudio: React.FC<LayoutStudioProps> = ({
  documents,
  selectedDoc,
  onSelectDoc,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [elements, setElements] = useState<DocumentElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null);

  // Display toggles
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showReadingOrderPath, setShowReadingOrderPath] = useState(true);
  const [showColumnGuides, setShowColumnGuides] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (selectedDoc) {
      loadLayout(selectedDoc.id);
    }
  }, [selectedDoc]);

  const loadLayout = async (docId: string) => {
    setLoading(true);
    setSelectedElement(null);
    try {
      const res = await api.getLayout(docId);
      setElements(res.elements);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const pageCount = selectedDoc?.pageCount || 1;
  const pageElements = elements.filter((e) => e.page === currentPage);
  const filteredElements =
    filterType === 'all' ? pageElements : pageElements.filter((e) => e.type === filterType);

  // Sorted by reading order for the path overlay
  const readingOrderElements = [...pageElements].sort((a, b) => a.readingOrderIndex - b.readingOrderIndex);

  return (
    <div className="space-y-5">
      {/* Top Document Selection & Mode Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Visual Layout & Reading Order Studio</h3>
            <p className="text-xs text-slate-400">
              Interactive 2D spatial bounding boxes and sequence analysis
            </p>
          </div>
        </div>

        {/* Document dropdown selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Active Document:</label>
          <select
            id="layout-doc-selector"
            value={selectedDoc?.id || ''}
            onChange={(e) => {
              const doc = documents.find((d) => d.id === e.target.value);
              if (doc) onSelectDoc(doc);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 max-w-xs truncate"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.originalName} ({d.fileType.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Canvas & Inspector Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Center: Interactive Visual Stage (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Canvas Controls Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-300">
                Page {currentPage} of {pageCount}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Toggles */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showBBoxes}
                  onChange={(e) => setShowBBoxes(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Bounding Boxes</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showReadingOrderPath}
                  onChange={(e) => setShowReadingOrderPath(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Reading Order Sequence</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showColumnGuides}
                  onChange={(e) => setShowColumnGuides(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Column Guides</span>
              </label>

              {/* Type Filter */}
              <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                >
                  <option value="all">All Elements</option>
                  <option value="title">Titles</option>
                  <option value="heading">Headings</option>
                  <option value="paragraph">Paragraphs</option>
                  <option value="table">Tables</option>
                  <option value="formula">Formulas</option>
                  <option value="list">Lists</option>
                </select>
              </div>
            </div>
          </div>

          {/* Document Canvas Sheet */}
          <div className="relative bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden p-6 sm:p-10 min-h-[750px] select-none">
            {/* Column Guide Overlay (if dual column) */}
            {showColumnGuides && selectedDoc?.metadata?.isMultiColumn && (
              <div
                className="absolute inset-y-0 border-r-2 border-dashed border-cyan-400/50 pointer-events-none z-10"
                style={{ left: '50%' }}
              >
                <span className="absolute top-2 -left-12 bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">
                  Gutter
                </span>
              </div>
            )}

            {/* Reading Order Path SVG Overlay */}
            {showReadingOrderPath && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" opacity="0.8" />
                  </marker>
                </defs>
                {readingOrderElements.map((el, i) => {
                  if (i === readingOrderElements.length - 1) return null;
                  const nextEl = readingOrderElements[i + 1];

                  // Normalized coordinate points (assumes 600x800 coordinate scale)
                  const startX = `${((el.boundingBox.x + el.boundingBox.width / 2) / el.boundingBox.pageWidth) * 100}%`;
                  const startY = `${((el.boundingBox.y + el.boundingBox.height / 2) / el.boundingBox.pageHeight) * 100}%`;
                  const endX = `${((nextEl.boundingBox.x + nextEl.boundingBox.width / 2) / nextEl.boundingBox.pageWidth) * 100}%`;
                  const endY = `${((nextEl.boundingBox.y + nextEl.boundingBox.height / 2) / nextEl.boundingBox.pageHeight) * 100}%`;

                  return (
                    <line
                      key={`path_${el.id}_${nextEl.id}`}
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow)"
                      opacity="0.65"
                    />
                  );
                })}
              </svg>
            )}

            {/* Element Bounding Box Rectangles */}
            <div className="relative w-full h-[700px]">
              {filteredElements.map((el) => {
                const isSelected = selectedElement?.id === el.id;
                const colors = ELEMENT_TYPE_COLORS[el.type] || ELEMENT_TYPE_COLORS.paragraph;

                // Relative percentages
                const left = `${(el.boundingBox.x / el.boundingBox.pageWidth) * 100}%`;
                const top = `${(el.boundingBox.y / el.boundingBox.pageHeight) * 100}%`;
                const width = `${(el.boundingBox.width / el.boundingBox.pageWidth) * 100}%`;
                const height = `${Math.max(24, (el.boundingBox.height / el.boundingBox.pageHeight) * 100)}%`;

                return (
                  <div
                    key={el.id}
                    id={`elem-box-${el.id}`}
                    onClick={() => setSelectedElement(el)}
                    className={`absolute cursor-pointer transition-all duration-150 p-2 rounded-md overflow-hidden ${
                      showBBoxes ? `${colors.bg} border-2 ${colors.border}` : 'hover:bg-slate-100/80'
                    } ${isSelected ? 'ring-4 ring-emerald-500 z-30 shadow-lg !border-emerald-600' : 'z-10'}`}
                    style={{
                      left,
                      top,
                      width,
                      minHeight: '28px',
                      maxHeight: height,
                    }}
                  >
                    {/* Bounding Box Tag */}
                    {showBBoxes && (
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1 opacity-90">
                        <span className="px-1 py-0.2 rounded bg-slate-900 text-white flex items-center gap-1 font-mono">
                          #{el.readingOrderIndex} {colors.label}
                        </span>
                        <span className="text-slate-700 font-mono text-[9px]">
                          {(el.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Text content preview */}
                    <div className="text-slate-900 text-xs font-serif leading-relaxed line-clamp-4">
                      {el.type === 'heading' || el.type === 'title' ? (
                        <span className="font-bold text-slate-950 font-sans">{el.text}</span>
                      ) : el.type === 'table' ? (
                        <div className="font-mono text-[10px] bg-amber-50 p-1 rounded border border-amber-200">
                          {el.text}
                        </div>
                      ) : el.type === 'formula' ? (
                        <div className="font-mono italic text-purple-900 bg-purple-50 p-1 rounded border border-purple-200">
                          {el.text}
                        </div>
                      ) : (
                        el.text
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Inspector Details Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Element Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-emerald-400">
              <Info className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Element Inspector</h4>
            </div>

            {selectedElement ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Type & Order Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md font-bold uppercase text-[11px] border ${
                      ELEMENT_TYPE_COLORS[selectedElement.type]?.bg
                    } ${ELEMENT_TYPE_COLORS[selectedElement.type]?.border} ${
                      ELEMENT_TYPE_COLORS[selectedElement.type]?.text
                    }`}
                  >
                    {ELEMENT_TYPE_COLORS[selectedElement.type]?.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Order: #{selectedElement.readingOrderIndex}
                    </span>
                    <span className="text-slate-400">
                      (Naive: #{selectedElement.naiveOrderIndex})
                    </span>
                  </div>
                </div>

                {/* Spatial Bounding Box Coordinates */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 font-mono text-[11px]">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Spatial 2D Coordinates
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>X: {selectedElement.boundingBox.x}px</div>
                    <div>Y: {selectedElement.boundingBox.y}px</div>
                    <div>Width: {selectedElement.boundingBox.width}px</div>
                    <div>Height: {selectedElement.boundingBox.height}px</div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/60 text-slate-400 flex items-center justify-between">
                    <span>Assigned Column:</span>
                    <span className="text-emerald-400 font-bold">
                      Column {selectedElement.column || 1}
                    </span>
                  </div>
                </div>

                {/* Model Confidence */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Classification Confidence:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {(selectedElement.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Extracted Text Content */}
                <div>
                  <div className="text-slate-400 text-[11px] font-medium mb-1.5">
                    Extracted Representation:
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {selectedElement.text}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Eye className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                <p className="text-xs">Click any bounding box on the sheet to inspect its properties.</p>
              </div>
            )}
          </div>

          {/* Color Legend Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Category Color Legend
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ELEMENT_TYPE_COLORS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded border ${val.border} ${val.bg}`} />
                  <span className="text-slate-400 text-[11px]">{val.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
