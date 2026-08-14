// src/classify.js
// Decides: is this a genuine question-and-answer exchange worth
// logging, or an instruction/command that should be discarded?
// It never rewrites the question or answer — only classifies.
// Uses Google's Gemini free tier. Model name is a setting, not
// hardcoded — check aistudio.google.com for the current free model
// if this one ever stops working (Google renames these often).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

async function classifyExchange(question, answer) {
  const prompt = `You classify a single exchange from a coding CLI session.
Decide if the USER's message is a genuine QUESTION seeking understanding
(why/what/how/explain/does/etc.) versus an INSTRUCTION/command telling the
AI to do something (make/fix/add/change/refactor/build/etc.).

Only genuine questions with a substantive answer should be kept.
Respond with ONLY minified JSON, no prose, no markdown fences:
{"keep": boolean, "topic": string, "project_hint": string}

"topic" is a short 2-4 word tag (e.g. "React useEffect", "Git rebase").
"project_hint" is your best guess at the project/language involved, or "".
If unsure whether it's a real question, default keep=false.

QUESTION: ${question}

ANSWER: ${answer}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = { classifyExchange };
