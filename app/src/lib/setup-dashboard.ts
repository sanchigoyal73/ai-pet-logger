import { z } from "zod";

// We use the same fetchWithRetry pattern established in Phase 2
// For brevity in setup, we'll implement a simple authenticated fetch.

const NOTION_VERSION = "2026-03-11"; // Needed for views API

async function notionRequest(path: string, method: string, token: string, body?: any) {
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

/**
 * Provisions the entire Master Dashboard and Database Views
 */
export async function setupMasterDashboard(token: string, parentPageId: string, gitDbId: string, learningDbId: string) {
  console.log("🐾 Building Learning Documentation Dashboard...");

  // 1. Create the Master Dashboard Page
  const dashboard = await notionRequest("/pages", "POST", token, {
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ text: { content: "🐾 Learning Documentation Dashboard" } }] }
    },
    children: [
      {
        object: "block",
        callout: {
          rich_text: [{ text: { content: "AI Pet is analyzing your progress... (Will update soon!)" } }],
          icon: { emoji: "💡" },
          color: "blue_background"
        }
      },
      { object: "block", divider: {} },
      {
        object: "block",
        heading_1: { rich_text: [{ text: { content: "Git Activity (Productivity)" } }] }
      },
      // Note: Notion API doesn't natively support embedding linked databases in the public API yet,
      // so we create the views on the databases themselves, which the user can access via the sidebar,
      // or we provide links to them here.
      {
        object: "block",
        paragraph: { rich_text: [{ text: { content: "Access your visual Git Trophy Case and Progress Rings via the Database Views." } }] }
      },
      { object: "block", divider: {} },
      {
        object: "block",
        heading_1: { rich_text: [{ text: { content: "Knowledge Base" } }] }
      },
      {
        object: "block",
        paragraph: { rich_text: [{ text: { content: "Access your visual Kanban Board and Learning Calendar via the Database Views." } }] }
      }
    ]
  });

  const dashboardId = dashboard.id;
  
  // Get Git DB data source
  const gitDb = await notionRequest(`/databases/${gitDbId}`, "GET", token);
  const gitDataSourceId = gitDb.data_sources?.[0]?.id;

  // 2. Add Progress Ring to Git DB
  // We use the properties endpoint to add a formula property
  await notionRequest(`/databases/${gitDbId}`, "PATCH", token, {
    properties: {
      "Weekly Goal Progress": {
        formula: {
          expression: 'round(prop("Lines Added") / 500 * 100) + "% 🟢"' // simple mock ring logic
        }
      }
    }
  });

  // 3. Create Gallery View (Trophy Case) for Git
  if (gitDataSourceId) {
    console.log("🐾 Creating Trophy Case Gallery View...");
    await notionRequest("/views", "POST", token, {
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

  // Get Learning DB data source
  const learningDb = await notionRequest(`/databases/${learningDbId}`, "GET", token);
  const learningDataSourceId = learningDb.data_sources?.[0]?.id;

  // 4. Create Kanban Board for Learnings
  if (learningDataSourceId) {
    console.log("🐾 Creating Knowledge Base Kanban Board...");
    await notionRequest("/views", "POST", token, {
      database_id: learningDbId,
      data_source_id: learningDataSourceId,
      name: "Knowledge Base",
      type: "board",
      configuration: {
        type: "board",
        group_by: "Keywords" // Group by the keywords property
      }
    });
    
    // 5. Create Calendar view for Learnings
    console.log("🐾 Creating Learning Calendar...");
    await notionRequest("/views", "POST", token, {
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

  console.log(`🐾 Dashboard created successfully! ID: ${dashboardId}`);
  return dashboardId;
}
