#!/usr/bin/env node
// src/setup-notion.js
// One-time setup: creates the Learnings and Git Activity databases
// for you, with the correct columns already in place.
//
// Usage: node src/setup-notion.js <parent_page_id>

try { require("dotenv").config(); } catch { /* optional */ }

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function notionRequest(path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function createLearningsDatabase(parentPageId) {
  return notionRequest("/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "Learnings" } }],
    properties: {
      Question: { title: {} },
      Answer: { rich_text: {} },
      Topic: { select: { options: [] } },
      Project: { rich_text: {} },
      Date: { date: {} },
    },
  });
}

async function createGitActivityDatabase(parentPageId) {
  return notionRequest("/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "Git Activity" } }],
    properties: {
      Name: { title: {} },
      Branch: { rich_text: {} },
      Commits: { rich_text: {} },
      "Files Changed": { number: {} },
      "Lines Added": { number: {} },
      "Lines Removed": { number: {} },
      Date: { date: {} },
    },
  });
}

async function main() {
  const parentPageId = process.argv[2];

  if (!parentPageId) {
    console.error("Usage: node src/setup-notion.js <parent_page_id>");
    process.exit(1);
  }
  if (!NOTION_TOKEN) {
    console.error("NOTION_TOKEN is missing from your .env file.");
    process.exit(1);
  }

  console.log("Creating Learnings database...");
  const learnings = await createLearningsDatabase(parentPageId);
  console.log("Created:", learnings.url);

  console.log("Creating Git Activity database...");
  const gitActivity = await createGitActivityDatabase(parentPageId);
  console.log("Created:", gitActivity.url);

  console.log("\nAdd these two lines to your .env file:\n");
  console.log(`NOTION_LEARNINGS_DB_ID=${learnings.id}`);
  console.log(`NOTION_GIT_DB_ID=${gitActivity.id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
