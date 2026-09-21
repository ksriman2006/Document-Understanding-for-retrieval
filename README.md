# Document Understanding for Retrieval: Layout, Tables and Reading Order

An AI-powered document understanding and retrieval system designed to eliminate the fundamental pitfalls of naive PDF scraping in Retrieval-Augmented Generation (RAG).

---

## 1. Problem Statement

Standard PDF extraction pipelines in naive RAG implementations suffer from severe structural failures:

1. **Scrambled Reading Order**: Multi-column documents (academic papers, newsletters) are scraped horizontally across scanlines, mixing left and right columns mid-sentence and destroying semantic coherence.
2. **Flattened Tables**: Relational grid structures are flattened into unstructured strings, breaking row/column associations and leading to severe hallucinations on financial and statistical queries.
3. **Lost Layout Information**: Hierarchy, section titles, headers, and footers are conflated with body text.
4. **Dropped Formulas & Specialized Notation**: Mathematical representations and code blocks lose tokens and syntax.
5. **Poisoned Embeddings & Hallucinations**: When chunks span disjoint columns or mutilated tables, vector embeddings lose meaning, directly causing retrieval misses and LLM hallucinations.

---

## 2. System Architecture & 8-Stage Processing Pipeline

Our structure-aware pipeline extracts, parses, and indexes documents with full geometric and semantic fidelity:

```
[Uploaded Document: PDF / DOCX / TXT]
                    │
                    ▼
       ┌────────────────────────┐
       │ 1. Document Extraction │
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 2. Layout Analyzer     │ ➔ 2D Bounding Boxes, Element Classification
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 3. Reading Order Recon │ ➔ Multi-column gutter detection, topological sort
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 4. Table Understanding │ ➔ 2D grid parsing, Markdown, structured JSON, searchable text
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 5. Formula Extraction  │ ➔ LaTeX & scientific expression isolation
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 6. Structural Chunking │ ➔ Header boundary preservation, table encapsulation
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 7. Embedding Service   │ ➔ Dense vector representations
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ 8. Vector Store & HNSW │ ➔ In-memory Cosine Vector DB with user isolation
       └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ Grounded RAG Synthesis │ ➔ LLM generation with verbatim citations
       └────────────────────────┘
```

---

## 3. Key Modules

- **`/backend/extraction/`**: Robust file parsing for PDF (`pdf-parse`), DOCX (`mammoth`), and TXT.
- **`/backend/layout/`**: 2D spatial layout analysis, bounding box extraction, and element classification (title, heading, subheading, paragraph, table, formula, list, header, footer).
- **`/backend/reading_order/`**: Multi-column boundary detection, topological traversal, Kendall-Tau sequence correlation, and inversion resolution.
- **`/backend/tables/`**: Structural 2D table extraction, cell coordinate tracking, Markdown generation, and searchable linearization.
- **`/backend/formulas/`**: Formula detection and LaTeX preservation.
- **`/backend/chunking/`**: Structure-aware chunking preventing cross-boundary fragmentation.
- **`/backend/embeddings/`**: Vector embedding engine with Gemini embedding model and fallback.
- **`/backend/vector_store/`**: Multi-tenant vector store with cosine similarity and user-level isolation.
- **`/backend/retrieval/`**: Table-boosted hybrid retrieval.
- **`/backend/rag/`**: Grounded question answering with source citations.
- **`/backend/evaluation/`**: Empirical benchmarking engine computing precision, recall, Kendall-Tau, and ablation deltas.

---

## 4. Frontend Visual Studios

- **Document Repository**: Drag-and-drop ingestion with instant 1-click benchmark corpus seeding.
- **Layout Understanding Studio**: Interactive 2D canvas displaying element bounding boxes, reading order arrows, and property inspector.
- **Reading Order Comparison**: Side-by-side diagnostic contrasting naive horizontal scraping against reconstructed semantic flow.
- **Table Understanding Studio**: Multi-format table viewer (Interactive Grid, Markdown, JSON, and Searchable Vector text) with 1-click "Ask AI about this table".
- **Semantic Search & RAG Studio**: Grounded query interface displaying model responses, table grounding badges, citation cards, and vector chunk inspectors.
- **Evaluation Dashboard**: Quantitative metrics comparing Naive RAG vs Structure-Aware RAG.

---

## 5. Automated Test Suite

Run the full automated test suite containing 13 comprehensive integration tests:

```bash
npx tsx backend/tests/run_tests.ts
```

All 13 verification assertions validate:
1. User registration & isolated tenant authentication
2. Document upload and pipeline orchestration
3. PDF / DOCX / TXT extraction
4. 2D Layout bounding box geometry
5. Multi-column reading order reconstruction
6. 2D Table structure parsing & Markdown conversion
7. Mathematical formula extraction
8. Structure-aware chunking without cross-element bleeding
9. Vector embeddings generation
10. Semantic cosine similarity retrieval
11. Grounded RAG question answering with citations
12. Multi-tenant document isolation
13. Quantitative evaluation benchmarks
