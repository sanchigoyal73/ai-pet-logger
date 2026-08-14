#!/usr/bin/env node
// src/log-git.js
// One row PER DAY in Git Activity — re-running this today updates
// today's row instead of creating a duplicate. Commit messages get
// summarized into readable "main tasks" via Gemini, not dumped raw.

try { require("dotenv").config(); } catch { /* optional */ }

const { extractTodayGitActivity } = require("./git-extract");
const { summarizeCommits } = require("./summarize");
const { createGitActivityRow, updateGitActivityRow, findTodayGitRow } = require("./notion");

async function main() {
  const activity = extractTodayGitActivity();

  if (activity.commits.length === 0) {
    console.log("No commits today — nothing to log.");
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const summary = await summarizeCommits(activity.commits);

  const existing = await findTodayGitRow(process.env.NOTION_GIT_DB_ID, date);

  const payload = {
    branch: activity.branch,
    commits: activity.commits,
    summary,
    filesChanged: activity.filesChanged,
    linesAdded: activity.linesAdded,
    linesRemoved: activity.linesRemoved,
    date,
  };

  if (existing) {
    const row = await updateGitActivityRow(existing.id, payload);
    console.log("Updated today's row in Notion:", row.url || row.id);
  } else {
    const row = await createGitActivityRow({ databaseId: process.env.NOTION_GIT_DB_ID, ...payload });
    console.log("Created today's row in Notion:", row.url || row.id);
  }

  console.log("Summary:", summary);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
