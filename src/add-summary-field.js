#!/usr/bin/env node
// src/add-summary-field.js
// One-time script: adds a "Summary" text column to the Git Activity
// database. Run this once, then you never need it again.
// Usage: node src/add-summary-field.js

try { require("dotenv").config(); } catch { /* optional */ }

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function main() {
  const databaseId = process.env.NOTION_GIT_DB_ID;
  if (!databaseId) {
    console.error("NOTION_GIT_DB_ID missing from .env");
    process.exit(1);
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      properties: { Summary: { rich_text: {} } },
    }),
  });

  if (!res.ok) {
    console.error(`Error: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  console.log("Summary field added to Git Activity database.");
}

main();
