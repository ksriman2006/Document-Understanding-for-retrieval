import { GoogleGenAI } from '@google/genai';
import { retrieveRelevantContext } from '../retrieval/engine.ts';
import { db } from '../database/db.ts';
import { RAGCitation, RAGQueryRecord } from '../types/index.ts';

const LLM_MODEL = process.env.LLM_MODEL || 'gemini-3.8-flash';

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

export async function executeRAGQuery(
  userId: string,
  question: string,
  documentId?: string
): Promise<RAGQueryRecord> {
  // 1. Retrieve top-K relevant chunks with table awareness
  const { results } = await retrieveRelevantContext(userId, question, { topK: 4, documentId });

  const citations: RAGCitation[] = results.map((res) => ({
    documentId: res.document.id,
    filename: res.document.filename,
    page: res.chunk.page,
    section: res.chunk.section,
    tableId: res.table ? res.table.tableId : res.chunk.tableId,
    similarity: res.similarity,
    snippet: res.chunk.content.slice(0, 280),
    elementType: res.chunk.chunkType,
  }));

  const tablesUsed: string[] = [];
  results.forEach((r) => {
    if (r.table && !tablesUsed.includes(r.table.tableId)) {
      tablesUsed.push(r.table.tableId);
    }
  });

  // If no chunks retrieved
  if (results.length === 0) {
    const emptyRecord: RAGQueryRecord = {
      id: `rag_${Date.now()}`,
      userId,
      question,
      answer: 'The requested information was not found in the available documents. Please upload and process documents first.',
      citations: [],
      tablesUsed: [],
      chunksUsedCount: 0,
      timestamp: new Date().toISOString(),
      modelUsed: 'none',
    };
    db.addRAGQuery(emptyRecord);
    return emptyRecord;
  }

  // Construct context block
  let contextBlock = '';
  results.forEach((res, i) => {
    contextBlock += `\n--- SOURCE ${i + 1} [Document: ${res.document.filename}, Page: ${res.chunk.page}, Section: ${res.chunk.section}${res.table ? `, Table: ${res.table.tableId} (${res.table.title})` : ''}] ---\n`;
    contextBlock += `${res.chunk.content}\n`;
  });

  const systemInstruction = `You are a high-precision AI Document Understanding and Retrieval Assistant.
Answer the user's question accurately and strictly based on the provided retrieved context.
Rules:
1. Base your answer ONLY on the provided context. If the information is not found in the retrieved documents, clearly state: "The requested information was not found in the available documents."
2. Never fabricate document-specific facts or invent data.
3. When answering from tables, cite the table values, rows, columns, and Table ID accurately.
4. Always cite your sources with Document name, Page number, Section, and Table ID (if applicable).
5. Format key numbers and findings clearly with bullet points.`;

  const prompt = `Retrieved Context:\n${contextBlock}\n\nQuestion: ${question}\n\nPlease provide an accurate, grounded answer with citations:`;

  let answer = '';
  let modelUsed = LLM_MODEL;

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: LLM_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2, // low temperature for high precision grounding
        },
      });

      if (response && response.text) {
        answer = response.text.trim();
      }
    } catch (err) {
      console.warn('Gemini LLM generation failed, switching to local grounded synthesizer:', (err as Error).message);
    }
  }

  // Local grounded extractive synthesis fallback if Gemini is not configured or failed
  if (!answer) {
    modelUsed = 'local-grounded-rag-engine';
    answer = generateGroundedAnswerFallback(question, results);
  }

  const queryRecord: RAGQueryRecord = {
    id: `rag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    question,
    answer,
    citations,
    tablesUsed,
    chunksUsedCount: results.length,
    timestamp: new Date().toISOString(),
    modelUsed,
  };

  db.addRAGQuery(queryRecord);
  return queryRecord;
}

function generateGroundedAnswerFallback(
  question: string,
  results: { chunk: any; document: any; similarity: number; table?: any }[]
): string {
  const topResult = results[0];
  const qLower = question.toLowerCase();

  // 1. Table specific query handling: e.g. "What was the profit in 2025?"
  for (const res of results) {
    if (res.table) {
      const { headers, rows, title, tableId } = res.table;
      // Search for year or row match
      const yearMatch = question.match(/\b(19\d\d|20\d\d)\b/);
      const targetYear = yearMatch ? yearMatch[1] : null;

      // Find relevant column index (e.g. 'profit', 'revenue')
      let matchedColIdx = -1;
      let colName = '';
      headers.forEach((h: string, idx: number) => {
        if (qLower.includes(h.toLowerCase())) {
          matchedColIdx = idx;
          colName = h;
        }
      });

      if (matchedColIdx !== -1 && targetYear) {
        const matchingRow = rows.find((row: string[]) => row.some((cell) => cell.includes(targetYear)));
        if (matchingRow && matchingRow[matchedColIdx]) {
          const val = matchingRow[matchedColIdx];
          return `Based on **${title}** (${tableId}) on **Page ${res.chunk.page}** of **${res.document.filename}**:\n\n` +
            `• The **${colName}** in **${targetYear}** was **${val}**.\n\n` +
            `**Source Citation**: [${res.document.filename}, Page ${res.chunk.page}, Table: ${tableId}]`;
        }
      }

      // General table summary if matched
      if (res.similarity > 0.5) {
        return `Based on retrieved table **${title}** (${tableId}) on **Page ${res.chunk.page}** of **${res.document.filename}**:\n\n` +
          `**Table Data**:\n${res.table.markdown}\n\n` +
          `**Source Citation**: [${res.document.filename}, Page ${res.chunk.page}, Table: ${tableId}]`;
      }
    }
  }

  // 2. High relevance text match
  if (topResult && topResult.similarity > 0.35) {
    const lines = topResult.chunk.content.split('\n').filter((l: string) => l.trim().length > 0);
    const relevantLines = lines.slice(0, 4).join('\n\n');

    return `Based on **${topResult.document.filename}** (Page ${topResult.chunk.page}, Section: "${topResult.chunk.section}"):\n\n` +
      `${relevantLines}\n\n` +
      `**Source Citation**: [${topResult.document.filename}, Page ${topResult.chunk.page}, Section: ${topResult.chunk.section}]`;
  }

  return 'The requested information was not found in the available documents.';
}
