import { db } from '../database/db.ts';
import { EmbeddingRecord, DocumentChunk, SearchResult, TableRecord } from '../types/index.ts';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export class VectorStore {
  insertEmbeddings(documentId: string, embeddings: EmbeddingRecord[]): void {
    db.setEmbeddings(documentId, embeddings);
  }

  deleteDocumentVectors(documentId: string, userId: string): void {
    const remaining = db.getEmbeddings(userId).filter((e) => e.documentId !== documentId);
    db.setEmbeddings(documentId, remaining);
  }

  search(
    userId: string,
    queryVector: number[],
    topK = 5,
    filterDocumentId?: string
  ): SearchResult[] {
    const allEmbeddings = db.getEmbeddings(userId);
    const candidateEmbeddings = filterDocumentId
      ? allEmbeddings.filter((e) => e.documentId === filterDocumentId)
      : allEmbeddings;

    const allChunks = db.getChunks(undefined, userId);
    const chunkMap = new Map<string, DocumentChunk>();
    allChunks.forEach((c) => chunkMap.set(c.id, c));

    const scored: { chunkId: string; documentId: string; similarity: number }[] = [];

    candidateEmbeddings.forEach((emb) => {
      const similarity = cosineSimilarity(queryVector, emb.vector);
      scored.push({
        chunkId: emb.chunkId,
        documentId: emb.documentId,
        similarity,
      });
    });

    // Sort by highest similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    const topScored = scored.slice(0, topK);

    const results: SearchResult[] = [];
    const allTables = db.getTables(undefined, userId);

    for (const item of topScored) {
      const chunk = chunkMap.get(item.chunkId);
      if (!chunk) continue;

      const doc = db.getDocumentById(item.documentId, userId);
      let matchedTable: TableRecord | undefined = undefined;

      if (chunk.tableId) {
        matchedTable = allTables.find((t) => t.tableId === chunk.tableId && t.documentId === item.documentId);
      }

      results.push({
        chunk,
        document: {
          id: doc ? doc.id : item.documentId,
          filename: doc ? doc.filename : 'Document',
          fileType: doc ? doc.fileType : 'pdf',
        },
        similarity: parseFloat(item.similarity.toFixed(4)),
        table: matchedTable,
      });
    }

    return results;
  }
}

export const vectorStore = new VectorStore();
