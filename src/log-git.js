#!/usr/bin/env node
// src/log-git.js
// One row PER DAY in Git Activity — re-running this today updates
// today's row instead of creating a duplicate. Commit messages get
// summarized into readable "main tasks" via Gemini, not dumped raw.

try { require("dotenv").config(); } catch { /* optional */ }

const fs = require('fs');
const path = require('path');
const os = require('os');

const { extractTodayGitActivity } = require("./git-extract");
const { summarizeCommits } = require("./summarize");
const { createGitActivityRow, updateGitActivityRow, findTodayGitRow } = require("./notion");

const RATE_LIMIT_MINUTES = 15;
const RATE_LIMIT_FILE = path.join(os.homedir(), '.ai-pet-git-last-run');

async function main() {
  const activity = extractTodayGitActivity();

  if (activity.commits.length === 0) {
    console.log("No commits today — nothing to log.");
    return;
  }

  const now = Date.now();
  if (fs.existsSync(RATE_LIMIT_FILE)) {
    const lastRun = parseInt(fs.readFileSync(RATE_LIMIT_FILE, 'utf8'), 10);
    if (!isNaN(lastRun) && (now - lastRun) < RATE_LIMIT_MINUTES * 60 * 1000) {
      console.log(`🐾 Skipping Git summary — ran less than ${RATE_LIMIT_MINUTES} minutes ago.`);
      return;
    }
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
  
  // Write rate-limit timestamp
  fs.writeFileSync(RATE_LIMIT_FILE, now.toString());
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
