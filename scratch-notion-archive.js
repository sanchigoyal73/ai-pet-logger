const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

async function archive(dbId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ archived: true }),
  });
  console.log(`Archived ${dbId}: ${res.ok}`);
}

async function main() {
  await archive("3bda2ce8-5eb7-8136-a4f2-d1925239e450");
  await archive("3bda2ce8-5eb7-81db-b254-f27fdc9ebe79");
}
main();
