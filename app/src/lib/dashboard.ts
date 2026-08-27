import { z } from "zod";

const NOTION_VERSION = "2022-06-28";

async function notionRequest(path: string, method: string, token: string, body?: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Updates the AI Suggestion Callout block on the Master Dashboard.
 * This should be called by the pipeline after summarizing daily activities.
 */
export async function updateAISuggestion(token: string, dashboardPageId: string, suggestion: string) {
  // 1. Fetch the blocks on the dashboard to find the Callout block
  const blocks = await notionRequest(`/blocks/${dashboardPageId}/children`, "GET", token);
  
  // Find the first callout block (which we provisioned for the AI suggestion)
  const calloutBlock = blocks.results.find((b: any) => b.type === "callout");
  
  if (!calloutBlock) {
    console.warn("Could not find the AI Suggestion callout block on the dashboard.");
    return;
  }
  
  // 2. Update the block with the new AI suggestion
  await notionRequest(`/blocks/${calloutBlock.id}`, "PATCH", token, {
    callout: {
      rich_text: [
        {
          text: { content: suggestion }
        }
      ],
      icon: { emoji: "💡" },
      color: "blue_background"
    }
  });
  
  console.log("🐾 Successfully updated AI Suggestion on Dashboard.");
}

/**
 * Generates an AI suggestion using Gemini based on recent stats.
 * Uses the prompt pattern established in our llm.ts
 */
export async function generateSuggestion(geminiKey: string, commitCount: number, recentTopics: string[]): Promise<string> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  const prompt = `
    You are an AI Developer Pet. Your owner just finished working.
    Today they made ${commitCount} commits and asked questions about: ${recentTopics.join(', ')}.
    
    Give a very brief, encouraging 1-sentence suggestion on what they should focus on next or praise their progress.
    Keep it playful.
  `;
  
  const response = await fetch(`${url}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
