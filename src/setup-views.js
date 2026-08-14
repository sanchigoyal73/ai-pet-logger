#!/usr/bin/env node
// src/setup-views.js
// One-time script: adds a Calendar view and a Chart view to the
// Git Activity database automatically, using Notion's Views API.
// Usage: node src/setup-views.js

try { require("dotenv").config(); } catch { /* optional */ }

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2026-03-11"; // Views API needs 2025-09-03 or later

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

async function main() {
  const databaseId = process.env.NOTION_GIT_DB_ID;
  if (!databaseId) {
    console.error("NOTION_GIT_DB_ID missing from .env");
    process.exit(1);
  }

  console.log("Reading database schema...");
  const db = await notionRequest(`/databases/${databaseId}`, "GET");

  const dataSourceId = db.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error("Could not find a data source on this database.");
  }

  const properties = db.properties || {};
  const dateProp = properties["Date"];
  const linesAddedProp = properties["Lines Added"];

  if (!dateProp || !linesAddedProp) {
    throw new Error(
      "Expected 'Date' and 'Lines Added' properties on Git Activity — check the database schema."
    );
  }

  console.log("Creating Calendar view...");
  const calendarView = await notionRequest("/views", "POST", {
    database_id: databaseId,
    data_source_id: dataSourceId,
    name: "Calendar",
    type: "calendar",
    configuration: {
      type: "calendar",
      date_property_id: dateProp.id,
    },
  });
  console.log("Created:", calendarView.url || calendarView.id);

  console.log("Creating Chart view (lines added per day)...");
  const chartView = await notionRequest("/views", "POST", {
    database_id: databaseId,
    data_source_id: dataSourceId,
    name: "Activity chart",
    type: "chart",
    configuration: {
      type: "chart",
      chart_type: "line",
      x_axis: {
        type: "date",
        property_id: dateProp.id,
        group_by: "day",
        sort: { type: "ascending" },
      },
      y_axis: {
        aggregator: "sum",
        property_id: linesAddedProp.id,
      },
      show_data_labels: true,
    },
  });
  console.log("Created:", chartView.url || chartView.id);

  console.log("\nDone. Both views now exist as tabs on your Git Activity database.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
