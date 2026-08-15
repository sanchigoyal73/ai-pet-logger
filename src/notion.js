// src/notion.js
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function notionRequest(path, method, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function findTodayLearningRow(databaseId, date) {
  const result = await notionRequest(`/databases/${databaseId}/query`, "POST", {
    filter: { property: "Date", date: { equals: date } },
  });
  return result.results?.[0] || null;
}

async function createLearningRow({ databaseId, keywords, project, date }) {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return notionRequest("/pages", "POST", {
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ text: { content: formattedDate } }] },
      Keywords: { multi_select: keywords.map(k => ({ name: k })) },
      Project: { rich_text: [{ text: { content: project || "" } }] },
      Date: { date: { start: date } },
    }
  });
}

async function appendLearningToPage(pageId, question, summary, originalAnswer) {
  const children = [
    {
      object: "block",
      heading_3: { rich_text: [{ text: { content: question.slice(0, 2000) } }] }
    },
    {
      object: "block",
      paragraph: { rich_text: [{ text: { content: summary.slice(0, 2000) } }] }
    },
    {
      object: "block",
      toggle: {
        rich_text: [{ text: { content: "Original Verbatim Answer" } }],
        children: [
          {
            object: "block",
            paragraph: {
              rich_text: [{ text: { content: originalAnswer.slice(0, 2000) } }]
            }
          }
        ]
      }
    },
    {
      object: "block",
      divider: {}
    }
  ];

  return notionRequest(`/blocks/${pageId}/children`, "PATCH", { children });
}

async function updateLearningRowKeywords(pageId, newKeywords) {
  return notionRequest(`/pages/${pageId}`, "PATCH", {
    properties: {
      Keywords: { multi_select: newKeywords.map(k => ({ name: k })) }
    }
  });
}

function gitActivityProperties({ branch, commits, summary, filesChanged, linesAdded, linesRemoved, date }) {
  return {
    Name: { title: [{ text: { content: `${date} — ${branch}` } }] },
    Branch: { rich_text: [{ text: { content: branch } }] },
    Commits: { rich_text: [{ text: { content: commits.join("\n").slice(0, 2000) } }] },
    Summary: { rich_text: [{ text: { content: (summary || "").slice(0, 2000) } }] },
    "Files Changed": { number: filesChanged },
    "Lines Added": { number: linesAdded },
    "Lines Removed": { number: linesRemoved },
    Date: { date: { start: date } },
  };
}

async function findTodayGitRow(databaseId, date) {
  const result = await notionRequest(`/databases/${databaseId}/query`, "POST", {
    filter: { property: "Date", date: { equals: date } },
  });
  return result.results?.[0] || null;
}

async function createGitActivityRow({ databaseId, ...rest }) {
  return notionRequest("/pages", "POST", {
    parent: { database_id: databaseId },
    properties: gitActivityProperties(rest),
  });
}

async function updateGitActivityRow(pageId, rest) {
  return notionRequest(`/pages/${pageId}`, "PATCH", {
    properties: gitActivityProperties(rest),
  });
}

module.exports = {
  createLearningRow,
  findTodayLearningRow,
  appendLearningToPage,
  updateLearningRowKeywords,
  createGitActivityRow,
  updateGitActivityRow,
  findTodayGitRow,
};
