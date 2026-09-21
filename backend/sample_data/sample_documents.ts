import fs from 'fs';
import path from 'path';
import { db, UPLOADS_DIR } from '../database/db.ts';
import { processDocumentPipeline } from '../services/pipeline.ts';

const SAMPLE_DIR = path.resolve(process.cwd(), 'data', 'sample');

export const SAMPLE_DOCS = [
  {
    filename: 'two_column_ai_research_paper.txt',
    title: 'Self-Attention Mechanisms in Multi-Column Document Understanding',
    fileType: 'txt' as const,
    content: `SELF-ATTENTION MECHANISMS IN MULTI-COLUMN DOCUMENT UNDERSTANDING
ACM Reference Format: Conference on Neural Information Processing (NeurIPS 2025)

Abstract
Traditional document retrieval systems rely on horizontal text stream serialization, which catastrophically breaks when encountering multi-column academic layouts and complex financial tables. In this paper, we propose a spatial graph neural network that reconstructs reading order prior to semantic chunking. Our approach demonstrates a 35.8% reduction in retrieval hallucination and preserves cross-column sentence continuity.

1. Introduction
Modern Retrieval-Augmented Generation (RAG) models assume that linear document streams correspond to logical human reading order. However, over 64% of peer-reviewed literature is published in dual-column format.
When naive extraction scans horizontally across the page, sentences from column one merge arbitrarily with column two, corrupting token embeddings.

2. Related Work
Optical Character Recognition (OCR) systems such as Tesseract traditionally focus on character fidelity rather than logical document semantics. Recent works by LayoutLM and Donut demonstrate the importance of 2D bounding boxes.
However, downstream vector retrieval pipelines frequently discard spatial metadata during the chunking phase.

3. Methodology and Mathematical Formulation
Let D = {e_1, e_2, ..., e_n} represent the set of detected visual bounding boxes on page p.
We define the column assignment probability:
P(col = 1 | x) = sigma(W_c * (x - x_mid))
Where x_mid is the detected gutter centroid separating left and right margins.

[Column 2]
4. Experimental Setup and Evaluation Benchmarks
We evaluate our structure-aware pipeline across 1,200 multi-column documents from arXiv and PubMed.
We compare against standard sliding-window naive retrieval.

Key Benchmark Findings:
- Precision@5 improves from 0.584 to 0.942 under multi-column conditions.
- Reading order Kendall-Tau rank correlation reaches 0.985 compared to 0.441 for naive PDF scrapers.
- Zero sentence breakage observed across section boundaries.

5. Discussion and Capstone Conclusion
Reconstructing reading order before vector indexing resolves the primary failure mode of document RAG.
Future work will extend this formulation to multi-lingual non-Latin scripts.`,
  },
  {
    filename: 'corporate_financial_report_2024_2025.txt',
    title: 'Global Tech Corp: Annual Fiscal Performance & Financial Audit (2024-2025)',
    fileType: 'txt' as const,
    content: `GLOBAL TECH CORP: ANNUAL FISCAL PERFORMANCE & FINANCIAL AUDIT (2024-2025)
Executive Summary & Q4 Board Review

1. Overview of Operating Revenue and Net Margin
Global Tech Corp recorded exceptional growth across cloud and artificial intelligence infrastructure divisions.
Operating revenue increased by 20% year-over-year, driven by enterprise AI adoption and operational efficiency.

Table 1: Consolidated Fiscal Summary 2024-2025
| Year | Revenue | Operating Expenses | Gross Profit | Net Margin (%) |
| 2024 | $100M | $80M | $20M | 20.0% |
| 2025 | $120M | $90M | $30M | 25.0% |
| 2026 (Est) | $155M | $105M | $50M | 32.2% |

2. Departmental Expenditure and Capital Allocation
Strategic investments in high-density GPU clusters accounted for $45M of total capital expenditure in 2025.
Research and Development (R&D) expenditure rose to $28M, representing 23.3% of total top-line revenue.

Table 2: Key Divisional Metrics 2025
| Department | Headcount | Q4 Budget | Completion Rate (%) |
| Cloud Services | 450 | $35M | 98.4% |
| AI Research Lab | 180 | $28M | 99.1% |
| Enterprise Sales | 220 | $15M | 94.7% |
| Legal & Operations | 65 | $12M | 96.0% |

3. Outlook and Strategic Guidance for Fiscal Year 2026
Management reiterates projected revenue guidance of $155M with gross profit target of $50M.
Cash reserves remain robust at $64M with zero long-term debt liabilities.`,
  },
  {
    filename: 'technical_specifications_and_formulas.txt',
    title: 'Distributed Vector Database Architecture & Latency Formulas',
    fileType: 'txt' as const,
    content: `DISTRIBUTED VECTOR DATABASE ARCHITECTURE & LATENCY FORMULAS
Technical Architecture Whitepaper - Version 3.4

1. System Architecture Overview
The distributed indexing layer partitions dense 384-dimensional embeddings across an Hierarchical Navigable Small World (HNSW) graph index.
The system guarantees sub-10ms query latency at 99th percentile across 10 million documents.

2. Mathematical Formulations & Distance Metrics
The similarity between query vector q and document chunk vector d is governed by Cosine Distance:
Formula 1: Cosine Similarity Equation
Similarity(q, d) = (q . d) / (||q|| * ||d||)

For normalized vectors, the Euclidean distance directly correlates with cosine similarity:
Formula 2: L2 Distance Transformation
D_L2(q, d) = sqrt(2 * (1 - CosineSimilarity(q, d)))

3. Core Architectural Components:
- Query Dispatcher: Normalizes user query tokens and computes vector embeddings.
- Graph Search Node: Traverses proximity graphs with dynamic beam width.
- Metadata Filter: Enforces user-specific cryptographic access boundaries.
- Context Reranker: Applies layout and tabular relevance weighting.

4. Performance SLAs
- Median Retrieval Latency: 4.2 ms
- Indexing Throughput: 15,000 vectors / second
- Memory Footprint: 1.4 GB per 100,000 document elements`,
  },
];

export async function seedSampleDocumentsForUser(userId: string): Promise<number> {
  if (!fs.existsSync(SAMPLE_DIR)) {
    fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  let createdCount = 0;

  for (const sample of SAMPLE_DOCS) {
    const docId = `doc_sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const diskPath = path.join(UPLOADS_DIR, `${docId}_${sample.filename}`);
    fs.writeFileSync(diskPath, sample.content, 'utf-8');

    // Create Document record
    const docRecord = db.createDocument({
      id: docId,
      userId,
      filename: sample.filename,
      originalName: sample.title,
      fileType: sample.fileType,
      fileSize: Buffer.byteLength(sample.content, 'utf-8'),
      pageCount: 1,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      filePath: diskPath,
    });

    // Run pipeline automatically so user immediately has full data
    await processDocumentPipeline(docId, userId);
    createdCount++;
  }

  return createdCount;
}
