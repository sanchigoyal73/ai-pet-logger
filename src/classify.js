// src/classify.js
// Decides: is this a genuine question-and-answer exchange worth
// logging, or an instruction/command that should be discarded?
// It never rewrites the question or answer — only classifies.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function classifyExchange(question, answer) {
  const system = `You classify a single exchange from a coding CLI session.
Decide if the USER's message is a genuine QUESTION seeking understanding
(why/what/how/explain/does/etc.) versus an INSTRUCTION/command telling the
AI to do something (make/fix/add/change/refactor/build/etc.).

Only genuine questions with a substantive answer should be kept.
Respond with ONLY minified JSON, no prose, no markdown fences:
{"keep": boolean, "topic": string, "project_hint": string}

"topic" is a short 2-4 word tag (e.g. "React useEffect", "Git rebase").
"project_hint" is your best guess at the project/language involved, or "".
If unsure whether it's a real question, default keep=false.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: `QUESTION: ${question}\n\nANSWER: ${answer}` }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = { classifyExchange };
