# AI Developer Pet — MVP starter

Two independent tracks, both writing to Notion. No daemon, no Tauri, no
Rust yet — this is the smallest version worth testing before building
any of that.

## Track 1: Git activity (what the CLI actually did)

Pure git metadata. No LLM involved, no session data touched.

    node src/log-git.js

Run it from inside your project's repo, any time — it pulls today's
commits and diff stats and writes one row to Notion.

## Track 2: Learnings (what you asked and understood)

For now this is manual — paste in a question/answer pair from your
agy session by hand. That's intentional: it lets you validate the
sanitize → classify → Notion pipeline before wiring up any automatic
capture from agy.

    node src/log-qa.js "why does this need useEffect" "because..." "my-app"

It will:
1. Run a local, non-AI secret scan on both strings — if anything looks
   like a key, token, password, or `.env` reference, it stops and logs
   nothing.
2. Ask Claude to classify: was this a real question, or an instruction?
   Instructions get discarded.
3. If it's a keep, write the *verbatim* question and answer to Notion
   (not a summary) with a short topic tag.

## Setup

1. `npm install`
2. Create a Notion integration at notion.so/my-integrations → New
   integration → copy the token into `NOTION_TOKEN`.
3. Create two Notion databases:
   - **Learnings**: `Question` (title), `Answer` (text), `Topic`
     (select), `Project` (text), `Date` (date)
   - **Git Activity**: `Name` (title), `Branch` (text), `Commits`
     (text), `Files Changed` (number), `Lines Added` (number),
     `Lines Removed` (number), `Date` (date)
4. Share both databases with your integration (••• menu → Connections
   → your integration).
5. Copy each database's ID from its URL into `NOTION_LEARNINGS_DB_ID`
   / `NOTION_GIT_DB_ID`.
6. Copy `.env.example` to `.env` and fill in your tokens.

## What's deliberately NOT here yet

- Automatic capture from agy — investigate agy's hooks / headless
  output first (`agy --help`, its docs), then wire `log-qa.js` to be
  called automatically instead of by hand.
- Scheduling (cron / launchd) so `log-git.js` runs daily on its own.
- Any Tauri/Rust/desktop shell — add that only once this pipeline is
  proven to actually work the way you want.
- The "is this genuinely new to me" check against Notion history —
  right now every kept question gets logged, even repeats. Add that
  once you've seen how noisy the raw log is.
