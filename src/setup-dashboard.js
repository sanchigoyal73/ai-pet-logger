#!/usr/bin/env node
require('dotenv').config();

const { getSecret } = require('./keychain');

// Notion currently does not support creating databases/views natively in the public API yet without beta flags,
// but we mimic the setup-views logic we used previously.
const NOTION_VERSION = "2026-03-11"; 

async function notionRequest(path, method, body) {
  const token = await getSecret('NOTION_TOKEN', 'NOTION_TOKEN');
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

async function setupDashboard() {
  const gitDbId = await getSecret('NOTION_GIT_DB_ID', 'NOTION_GIT_DB_ID');
  const learningDbId = await getSecret('NOTION_LEARNINGS_DB_ID', 'NOTION_LEARNINGS_DB_ID');

  if (!gitDbId || !learningDbId) {
    console.error("Missing NOTION_GIT_DB_ID or NOTION_LEARNINGS_DB_ID in .env or keychain");
    return;
  }

  console.log("🐾 Building Learning Documentation Dashboard in Notion...");

  // 1. Get the parent page ID from the learning DB to create the Dashboard adjacent to it
  const learningDb = await notionRequest(`/databases/${learningDbId}`, "GET");
  const parentPageId = learningDb.parent.page_id || learningDb.parent.workspace;

  // 2. Create the Master Dashboard Page
  const dashboard = await notionRequest("/pages", "POST", {
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ text: { content: "🐾 Learning Documentation Dashboard" } }] }
    },
    children: [
      {
        object: "block",
        callout: {
          rich_text: [{ text: { content: "AI Pet is analyzing your progress... Keep coding!" } }],
          icon: { emoji: "💡" },
          color: "blue_background"
        }
      },
      { object: "block", divider: {} },
      {
        object: "block",
        heading_1: { rich_text: [{ text: { content: "Knowledge Base" } }] }
      },
      {
        object: "block",
        paragraph: { rich_text: [{ text: { content: "View your Learning Calendar and Kanban Board in the databases below." } }] }
      }
    ]
  });

  console.log(`✅ Dashboard created! ID: ${dashboard.id}`);
  
  // 3. Setup views for Learning DB
  const learningDataSourceId = learningDb.data_sources?.[0]?.id;
  if (learningDataSourceId) {
    console.log("🐾 Creating Kanban Board and Calendar for Learnings...");
    
    // Kanban Board
    await notionRequest("/views", "POST", {
      database_id: learningDbId,
      data_source_id: learningDataSourceId,
      name: "Knowledge Base",
      type: "board",
      configuration: {
        type: "board",
        group_by: "Keywords"
      }
    });

    // Calendar
    await notionRequest("/views", "POST", {
      database_id: learningDbId,
      data_source_id: learningDataSourceId,
      name: "Learning Calendar",
      type: "calendar",
      configuration: {
        type: "calendar",
        date_property_id: learningDb.properties["Date"]?.id
      }
    });
  }

  // 4. Setup Trophy Case (Gallery) for Git DB
  const gitDb = await notionRequest(`/databases/${gitDbId}`, "GET");
  const gitDataSourceId = gitDb.data_sources?.[0]?.id;
  
  if (gitDataSourceId) {
    console.log("🐾 Creating Trophy Case Gallery View for Git Activity...");
    await notionRequest("/views", "POST", {
      database_id: gitDbId,
      data_source_id: gitDataSourceId,
      name: "Trophy Case (Most Productive)",
      type: "gallery",
      configuration: {
        type: "gallery",
        gallery_card_size: "large",
        sort: [
          { property_id: gitDb.properties["Lines Added"]?.id, direction: "descending" }
        ]
      }
    });
  }

  console.log("✅ All Notion visuals have been successfully restored and provisioned!");
}

setupDashboard().catch(console.error);
