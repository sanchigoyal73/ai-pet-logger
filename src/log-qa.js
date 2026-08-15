#!/usr/bin/env node
// src/log-qa.js
// MVP entry point for the "learning" track.
// Usage: node src/log-qa.js "your question" "the CLI's answer" ["project name"]

try { require("dotenv").config(); } catch { /* dotenv optional if env is set another way */ }

const { sanitize } = require("./sanitize");
const { classifyExchange } = require("./classify");
const { 
  findTodayLearningRow, 
  createLearningRow, 
  appendLearningToPage, 
  updateLearningRowKeywords 
} = require("./notion");

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

  const date = new Date().toISOString().slice(0, 10);
  const databaseId = process.env.NOTION_LEARNINGS_DB_ID;
  const newKeywords = verdict.keywords || [];

  let row = await findTodayLearningRow(databaseId, date);

  if (!row) {
    row = await createLearningRow({
      databaseId,
      keywords: newKeywords,
      project: project || verdict.project_hint,
      date,
    });
    console.log("Created new daily learning page:", row.url || row.id);
  } else {
    const existingKeywords = row.properties.Keywords?.multi_select?.map(k => k.name) || [];
    const mergedKeywords = Array.from(new Set([...existingKeywords, ...newKeywords]));
    
    await updateLearningRowKeywords(row.id, mergedKeywords);
    console.log("Updated keywords on existing daily page:", row.url || row.id);
  }

  await appendLearningToPage(row.id, question, verdict.answer_summary || "No summary provided.", answer);
  console.log("Appended Q&A to the page.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
