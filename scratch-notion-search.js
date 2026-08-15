const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function main() {
  const res = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      filter: {
        value: "database",
        property: "object"
      }
    }),
  });
  const data = await res.json();
  if (data.results) {
    data.results.forEach(db => {
      console.log(`Title: ${db.title[0]?.plain_text}, ID: ${db.id}, Created: ${db.created_time}`);
    });
  } else {
    console.log(data);
  }
}
main();
