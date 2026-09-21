import { GoogleGenAI } from '@google/genai';
import { EmbeddingRecord } from '../types/index.ts';

const EMBEDDING_MODEL_NAME = process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview';
const VECTOR_DIMENSIONS = 384;

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Deterministic high-dimensional hash embedding (384-dim, normalized)
// Extracts unigrams, bigrams, subwords, numerical values and projects to dense sphere
export function generateLocalDenseEmbedding(text: string, dimensions = VECTOR_DIMENSIONS): number[] {
  const vector = new Array(dimensions).fill(0);
  const clean = text.toLowerCase().replace(/[^\w\s\$\%\.\-]/g, ' ');
  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);

  if (tokens.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  // 1. Unigrams and weights
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const isNumber = /^\d+(\.\d+)?%?$/.test(word);
    const weight = isNumber ? 2.5 : word.length > 3 ? 1.5 : 1.0;

    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += weight;

    // 2. Bigrams
    if (i < tokens.length - 1) {
      const bigram = `${word}_${tokens[i + 1]}`;
      let bHash = 0;
      for (let c = 0; c < bigram.length; c++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(c);
        bHash |= 0;
      }
      const bIdx = Math.abs(bHash) % dimensions;
      vector[bIdx] += 2.0;
    }
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-9;
  for (let i = 0; i < dimensions; i++) {
    vector[i] /= norm;
  }

  return vector;
}

export async function generateEmbedding(text: string): Promise<{ vector: number[]; model: string }> {
  const ai = getGeminiClient();

  if (ai) {
    try {
      // Try Gemini embedding
      const response = await (ai.models as any).embedContent({
        model: EMBEDDING_MODEL_NAME,
        contents: text,
      });

      if (response && response.embedding && response.embedding.values) {
        return {
          vector: response.embedding.values,
          model: EMBEDDING_MODEL_NAME,
        };
      }
    } catch (err) {
      console.warn('Gemini embedding failed or model unavailable, falling back to dense embedding:', (err as Error).message);
    }
  }

  // Local dense embedding fallback
  return {
    vector: generateLocalDenseEmbedding(text),
    model: 'local-dense-384',
  };
}

export async function generateBatchEmbeddings(
  chunks: { id: string; documentId: string; userId: string; content: string }[]
): Promise<EmbeddingRecord[]> {
  const records: EmbeddingRecord[] = [];
  const now = new Date().toISOString();

  for (const chunk of chunks) {
    const { vector, model } = await generateEmbedding(chunk.content);
    records.push({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      userId: chunk.userId,
      vector,
      model,
      createdAt: now,
    });
  }

  return records;
}
