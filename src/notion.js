// src/notion.js
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

async function createLearningRow({ databaseId, question, answer, topic, project, date }) {
  return notionRequest("/pages", {
    parent: { database_id: databaseId },
    properties: {
      Question: { title: [{ text: { content: question.slice(0, 2000) } }] },
      Answer: { rich_text: [{ text: { content: answer.slice(0, 2000) } }] },
      Topic: { select: { name: topic || "General" } },
      Project: { rich_text: [{ text: { content: project || "" } }] },
      Date: { date: { start: date } },
    },
  });
}

async function createGitActivityRow({ databaseId, branch, commits, filesChanged, linesAdded, linesRemoved, date }) {
  return notionRequest("/pages", {
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ text: { content: `${date} — ${branch}` } }] },
      Branch: { rich_text: [{ text: { content: branch } }] },
      Commits: { rich_text: [{ text: { content: commits.join("\n").slice(0, 2000) } }] },
      "Files Changed": { number: filesChanged },
      "Lines Added": { number: linesAdded },
      "Lines Removed": { number: linesRemoved },
      Date: { date: { start: date } },
    },
  });
}

module.exports = { createLearningRow, createGitActivityRow };
