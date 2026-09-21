import { vectorStore } from '../vector_store/store.ts';
import { generateEmbedding } from '../embeddings/service.ts';
import { db } from '../database/db.ts';
import { SearchResult } from '../types/index.ts';

export interface RetrievalOptions {
  topK?: number;
  documentId?: string;
}

export async function retrieveRelevantContext(
  userId: string,
  query: string,
  options: RetrievalOptions = {}
): Promise<{
  results: SearchResult[];
  queryVectorModel: string;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const topK = options.topK || 5;

  // 1. Generate query embedding
  const { vector: queryVector, model } = await generateEmbedding(query);

  // 2. Query vector database
  const rawResults = vectorStore.search(userId, queryVector, topK * 2, options.documentId);

  // 3. Table & Numerical keyword boosting:
  // If query asks for numbers, years, metrics, profit, revenue, or table data, boost table chunks
  const isTabularQuery =
    /\b(revenue|profit|year|\d{4}|table|cost|metric|percentage|rate|total|increase|decrease|growth|accuracy|precision|f1)\b/i.test(
      query
    );

  const queryTerms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

  const reRanked = rawResults.map((res) => {
    let score = res.similarity;
    const contentLower = res.chunk.content.toLowerCase();

    // Exact keyword matches bonus
    let keywordHits = 0;
    queryTerms.forEach((term) => {
      if (contentLower.includes(term)) {
        keywordHits++;
      }
    });

    if (keywordHits > 0) {
      score += Math.min(0.25, keywordHits * 0.05);
    }

    if (isTabularQuery && (res.chunk.chunkType === 'table_context' || res.table)) {
      score += 0.2; // Boost structured table understanding
    }

    return {
      ...res,
      similarity: parseFloat(Math.min(0.9999, Math.max(0.01, score)).toFixed(4)),
    };
  });

  reRanked.sort((a, b) => b.similarity - a.similarity);
  const finalResults = reRanked.slice(0, topK);

  const latencyMs = Date.now() - startTime;

  // Record search history
  db.addSearchHistory({
    id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    query,
    timestamp: new Date().toISOString(),
    resultsCount: finalResults.length,
    latencyMs,
  });

  return {
    results: finalResults,
    queryVectorModel: model,
    latencyMs,
  };
}
