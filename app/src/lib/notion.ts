import { z } from "zod";

const MAX_RETRIES = 3;

// Zod schemas for validation
export const QAEntrySchema = z.object({
  topic: z.string(),
  question: z.string(),
  answer: z.string(),
  date: z.string() // ISO date
});
export type QAEntry = z.infer<typeof QAEntrySchema>;

export const GitEntrySchema = z.object({
  summary: z.string(),
  branch: z.string(),
  date: z.string()
});
export type GitEntry = z.infer<typeof GitEntrySchema>;

/**
 * Enhanced fetch with exponential backoff for rate limits (429s).
 * Fails fast on 400-level errors to prevent wasting API calls.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    if (retries >= MAX_RETRIES) {
      throw new Error("Max retries exceeded for rate limits.");
    }
    // Exponential backoff: 5s, 10s, 20s
    const waitTime = Math.pow(2, retries) * 5000; 
    console.warn(`[Notion API] Rate limited (429). Retrying in ${waitTime}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return fetchWithRetry(url, options, retries + 1);
  }
  
  // Fail fast on hard client errors (e.g., 400 Bad Request, 401 Unauthorized)
  if (!response.ok && response.status >= 400 && response.status < 500) {
    const errorText = await response.text();
    throw new Error(`[Notion API] Hard error ${response.status}: ${errorText}`);
  }
  
  return response;
}

export async function writeQAToNotion(apiKey: string, dbId: string, entryData: QAEntry) {
  // Validate input
  const entry = QAEntrySchema.parse(entryData);
  
  const payload = {
    parent: { database_id: dbId },
    properties: {
      "Topic": { title: [{ text: { content: entry.topic } }] },
      "Date": { date: { start: entry.date } }
    },
    children: [
      {
        object: "block",
        heading_2: { rich_text: [{ text: { content: "Question" } }] }
      },
      {
        object: "block",
        code: { rich_text: [{ text: { content: entry.question } }], language: "markdown" }
      },
      {
        object: "block",
        heading_2: { rich_text: [{ text: { content: "Answer" } }] }
      },
      {
        object: "block",
        code: { rich_text: [{ text: { content: entry.answer } }], language: "markdown" }
      }
    ]
  };

  const response = await fetchWithRetry('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}
