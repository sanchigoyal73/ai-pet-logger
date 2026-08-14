#!/usr/bin/env node
// src/log-git.js
// MVP entry point for the "AI/action" track — pure git metadata,
// no AI call, no session data touched. Run from inside a git repo.
// Usage: node src/log-git.js

try { require("dotenv").config(); } catch { /* dotenv optional if env is set another way */ }

const { extractTodayGitActivity } = require("./git-extract");
const { createGitActivityRow } = require("./notion");

async function main() {
  const activity = extractTodayGitActivity();

  if (activity.commits.length === 0) {
    console.log("No commits today — nothing to log.");
    return;
  }

  const row = await createGitActivityRow({
    databaseId: process.env.NOTION_GIT_DB_ID,
    branch: activity.branch,
    commits: activity.commits,
    filesChanged: activity.filesChanged,
    linesAdded: activity.linesAdded,
    linesRemoved: activity.linesRemoved,
    date: new Date().toISOString().slice(0, 10),
  });

  console.log("Logged git activity to Notion:", row.url || row.id);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
