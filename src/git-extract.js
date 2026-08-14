// src/git-extract.js
// Pure git metadata. No AI, no session data touched — this is the
// "what did the CLI actually do" track.
const { execSync } = require("child_process");

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function extractTodayGitActivity() {
  const branch = run("git rev-parse --abbrev-ref HEAD") || "unknown";

  const commits = run('git log --since="midnight" --pretty=format:%s')
    .split("\n")
    .filter(Boolean);

  const diffStat = run('git diff --stat HEAD@{midnight}') || run("git diff --stat");
  const filesChangedMatch = diffStat.match(/(\d+) files? changed/);
  const insertionsMatch = diffStat.match(/(\d+) insertions?\(\+\)/);
  const deletionsMatch = diffStat.match(/(\d+) deletions?\(-\)/);

  return {
    branch,
    commits,
    filesChanged: filesChangedMatch ? parseInt(filesChangedMatch[1], 10) : 0,
    linesAdded: insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0,
    linesRemoved: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
  };
}

module.exports = { extractTodayGitActivity };
