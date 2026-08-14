// src/summarize.js
// Turns a list of raw commit messages into a short, readable summary
// of what was actually worked on today — not a repeat of the messages.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

async function summarizeCommits(commits) {
  if (!commits.length) return "";

  const prompt = `Here are today's git commit messages from a coding session:

${commits.map((c) => `- ${c}`).join("\n")}

Write a short 1-3 sentence plain-English summary of the main tasks worked
on today. Describe what was actually accomplished, grouped by theme if
there are multiple unrelated things — don't just restate the commit
messages. No preamble, just the summary text.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

module.exports = { summarizeCommits };
