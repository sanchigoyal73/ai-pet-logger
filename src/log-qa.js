#!/usr/bin/env node
// src/log-qa.js
// MVP entry point for the "learning" track.
// Usage: node src/log-qa.js "your question" "the CLI's answer" ["project name"]

try { require("dotenv").config(); } catch { /* dotenv optional if env is set another way */ }

const { sanitize } = require("./sanitize");
const { classifyExchange } = require("./classify");
const { createLearningRow } = require("./notion");

async function main() {
  const [question, answer, project = ""] = process.argv.slice(2);

  if (!question || !answer) {
    console.error('Usage: node src/log-qa.js "question" "answer" ["project"]');
    process.exit(1);
  }

  const qCheck = sanitize(question);
  const aCheck = sanitize(answer);

  if (qCheck.blocked || aCheck.blocked) {
    console.log("Blocked — possible secret detected. Nothing sent anywhere.");
    console.log("Matched patterns:", [...qCheck.hits, ...aCheck.hits]);
    return;
  }

  const verdict = await classifyExchange(question, answer);

  if (!verdict.keep) {
    console.log("Classified as instruction, not a learning moment — skipped.");
    return;
  }

  const row = await createLearningRow({
    databaseId: process.env.NOTION_LEARNINGS_DB_ID,
    question,
    answer,
    topic: verdict.topic,
    project: project || verdict.project_hint,
    date: new Date().toISOString().slice(0, 10),
  });

  console.log("Logged to Notion:", row.url || row.id);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
