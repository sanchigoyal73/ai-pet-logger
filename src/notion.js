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

function parseRichText(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: { content: text.substring(lastIndex, match.index) }
      });
    }
    const matchedStr = match[0];
    if (matchedStr.startsWith('**')) {
       parts.push({
         text: { content: matchedStr.substring(2, matchedStr.length - 2) },
         annotations: { bold: true }
       });
    } else if (matchedStr.startsWith('`')) {
       parts.push({
         text: { content: matchedStr.substring(1, matchedStr.length - 1) },
         annotations: { code: true }
       });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: { content: text.substring(lastIndex) } });
  }
  return parts.length > 0 ? parts : [{ text: { content: text.slice(0, 2000) } }];
}

function parseMarkdownToNotionBlocks(md) {
  const blocks = [];
  const lines = md.split('\n');
  let currentParagraph = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({
        object: "block",
        paragraph: { rich_text: parseRichText(currentParagraph.join('\n').slice(0, 2000)) }
      });
      currentParagraph = [];
    }
  }

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      blocks.push({ object: "block", heading_3: { rich_text: parseRichText(trimmed.substring(4).slice(0, 2000)) } });
    } else if (trimmed.startsWith('## ')) {
      flushParagraph();
      blocks.push({ object: "block", heading_2: { rich_text: parseRichText(trimmed.substring(3).slice(0, 2000)) } });
    } else if (trimmed.startsWith('# ')) {
      flushParagraph();
      blocks.push({ object: "block", heading_1: { rich_text: parseRichText(trimmed.substring(2).slice(0, 2000)) } });
    } else if (trimmed === '') {
      flushParagraph();
    } else {
      currentParagraph.push(line);
    }
  }
  flushParagraph();
  
  if (blocks.length === 0) {
     blocks.push({ object: "block", paragraph: { rich_text: [{ text: { content: md.slice(0,2000) } }] } });
  }
  return blocks;
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
        children: parseMarkdownToNotionBlocks(originalAnswer)
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
