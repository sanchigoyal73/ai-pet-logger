import { z } from "zod";

const MAX_RETRIES = 2;

// Output validation schema for the LLM's classification
const ClassificationResultSchema = z.object({
  type: z.enum(["question", "instruction", "unknown"]),
  topic: z.string().optional()
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

/**
 * Calls the Gemini API with backoff for 429s.
 */
async function fetchGeminiWithRetry(url: string, apiKey: string, body: any, retries = 0): Promise<any> {
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (response.status === 429) {
    if (retries >= MAX_RETRIES) throw new Error("Gemini rate limit exceeded.");
    const waitTime = Math.pow(2, retries) * 5000; 
    console.warn(`[Gemini API] Rate limited. Retrying in ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return fetchGeminiWithRetry(url, apiKey, body, retries + 1);
  }
  
  if (!response.ok) {
    throw new Error(`[Gemini API] Hard error ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

export async function classifyQuestion(apiKey: string, question: string): Promise<ClassificationResult> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  const prompt = `
    Classify the following prompt from a developer.
    Is it a genuine "question" seeking understanding, or an "instruction" telling the AI to do something?
    Return a JSON object: { "type": "question" | "instruction", "topic": "Short Topic Tag" }
    
    Prompt:
    "${question}"
  `;
  
  const data = await fetchGeminiWithRetry(url, apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });
  
  try {
    const textResponse = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(textResponse);
    // Validate output strictly using Zod
    return ClassificationResultSchema.parse(parsed);
  } catch (e) {
    throw new Error(`Failed to parse/validate LLM response: ${e}`);
  }
}
