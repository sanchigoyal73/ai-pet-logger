# AI Developer Pet — Idea, Flow & Architecture

---

## 1. The Idea

A small, local AI companion that quietly observes development work and automatically maintains a developer journal in Notion — without requiring the developer to write anything themselves.

It is not a SaaS product, not a dashboard, not a general-purpose activity logger. At its core, it is:

> An intelligent activity interpreter that decides what's worth remembering, and writes it to Notion on your behalf.

### 1.1 The Problem

Manually maintaining a development journal is tedious enough that most people stop doing it within days. Hours of real work — debugging, learning, decisions made — evaporate from memory because nothing captures them in the moment, and writing it all down after the fact feels like a chore on top of the actual work.

### 1.2 The Core Philosophy

```
Development activity
        ↓
    🐾 AI Pet
        ↓
understands what actually happened
        ↓
decides what is worth remembering
        ↓
      Notion
```

**Notion is the permanent memory.** The pet does not build or maintain its own separate long-term database — it observes, interprets, and writes into Notion, which remains the single source of truth for the developer's history.

### 1.3 What Makes This Different From a Git Activity Logger

Git already records *what got built*. That's not the interesting or hard part. What this project actually cares about is:

- What the developer **asked** their AI coding tool
- What they **understood** as a result
- Distinguished clearly from what the AI simply generated on its own

Routine AI-generated code, trivial styling tweaks, and repeated/basic questions are explicitly **not** logged. The system favors omission over noise — when uncertain whether something is meaningful, it leaves it out rather than inventing significance.

### 1.4 Two Separate Kinds of Record

| | What it captures | Source | Involves AI judgment? |
|---|---|---|---|
| **AI/Action track** | What was actually built — commits, files changed, lines added/removed | Git metadata | Only for summarizing into plain language, not for deciding what counts |
| **Learning track** | What the developer asked and understood | Real question-and-answer exchanges with the coding CLI | Yes — classifies question vs. instruction |

These are deliberately kept independent. Together, they tell a complete and honest story: *what got built, and what the developer actually engaged with and understood along the way* — rather than blending the two into a single ambiguous "activity log."

---

## 2. The Flow

### 2.1 End-to-End Flow (Both Tracks)

```
                    ┌─────────────────────────┐
                    │   Developer's machine    │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                       │
      ┌───────▼────────┐                    ┌────────▼─────────┐
      │   GIT TRACK     │                    │  LEARNING TRACK   │
      │  (what got built)│                   │ (what was learned) │
      └───────┬────────┘                    └────────┬─────────┘
              │                                       │
     git log / git diff                    Q&A exchange with agy
              │                                       │
              ▼                                       ▼
     Extract commits,                     Local secret sanitization
     files changed,                       (no AI — regex/pattern scan)
     lines added/removed                            │
              │                              blocked? → discard, stop
              ▼                                       │
     Summarize into                                  ▼
     plain-English                          AI classifies: question
     "main tasks" (AI)                      or instruction?
              │                                       │
              ▼                             instruction? → discard
     Check: does today's                              │
     row already exist?                       question? → keep
              │                                       │
       yes → update                                   ▼
       no  → create                          Write VERBATIM question
              │                              + answer to Notion
              ▼                                       │
     Notion: Git Activity                             ▼
     database (one row/day)                Notion: Learnings database
              │                                       │
              └───────────────────┬───────────────────┘
                                  ▼
                    Notion — permanent developer journal
                    (Calendar view, Chart view, browsable history)
```

### 2.2 Learning Track — Detailed Step-by-Step

1. **Capture** — a real question the developer asked their coding CLI, and the answer it gave (currently captured manually; automatic capture from the CLI is a planned future step).
2. **Sanitize** — a local, deterministic, non-AI pattern scan checks both the question and answer for anything resembling an API key, token, password, private key block, or `.env` reference. If anything matches, the entire exchange is discarded immediately — nothing is sent anywhere, not even to the classifier.
3. **Classify** — the sanitized exchange is sent to an LLM with one narrow job: is this a genuine question seeking understanding, or an instruction/command telling the AI to do something? Instructions are discarded. The model also returns a short topic tag for organization, but never rewrites the actual question or answer.
4. **Write** — if classified as a real question, the exact original text of both the question and the answer is written to Notion, tagged with topic, project, and date. No summarization or paraphrasing of the content itself happens at this stage — only classification and tagging.

### 2.3 Git Track — Detailed Step-by-Step

1. **Extract** — pure git metadata is pulled locally: current branch, today's commit messages, files changed, lines added/removed. No AI is involved in this step, and the LLM never receives raw repository access — only this structured, already-extracted data.
2. **Summarize** — the list of commit messages is sent to an LLM with instructions to describe, in plain English, what was actually accomplished — grouped by theme if multiple unrelated things happened. This produces a short human-readable summary rather than a wall of raw commit text.
3. **Upsert** — before writing, the system checks whether a row for *today's date* already exists in the Git Activity database. If it does, that row is updated (so running the process multiple times in a day never creates duplicates). If not, a new row is created.
4. **Visualize** — separately, a Calendar view and a Chart view are attached to the Git Activity database itself, built once via Notion's API. These aren't part of the daily write flow — they're standing views that automatically render whatever rows exist, updating live as new days are added.

---

## 3. The Architecture

### 3.1 Guiding Security Principle

> **The smartest component should have the least authority.**

The LLM is never given raw filesystem access, shell execution, or credentials. It only ever receives already-extracted, already-sanitized data, and it only ever "acts" by returning a classification or a short piece of text — never by executing anything directly. A separate, deterministic layer decides what's actually allowed to happen with that output.

```
   LLM
    │  (judgment: "is this meaningful / a question / etc.")
    ▼
 Policy / Application Layer
    │  (deterministic: sanitize, permission, formatting)
    ▼
   Notion
```

Explicitly never exposed to the LLM: `.env` files, SSH keys, browser profile data, unrestricted source code, or shell/command execution capability.

### 3.2 Current MVP Architecture

The MVP intentionally uses the simplest possible implementation — plain scripts run manually, no background process, no desktop application.

```
┌─────────────────────────────────────────────┐
│              Local machine (CLI)              │
│                                               │
│  git-extract.js  ──┐                          │
│                    │                          │
│  sanitize.js  ─────┼──► summarize.js          │
│                    │    classify.js  ──► Gemini API (free tier)
│                    │                          │
│  log-git.js  ◄─────┘                          │
│  log-qa.js                                    │
│         │                                     │
│         ▼                                     │
│    notion.js  ───────────────────────► Notion API
│                                               │
└─────────────────────────────────────────────┘
```

- **Language/runtime:** Node.js — chosen for simplicity and zero build step, not the eventual production choice.
- **LLM:** Google Gemini free tier — used for both the question/instruction classifier and the commit summarizer.
- **Storage:** none locally — every write goes straight to Notion; there is no local database or event buffer yet.
- **Trigger:** fully manual — the developer runs each script by hand from the terminal.

This architecture exists solely to validate one thing: *is the underlying pipeline (extract → sanitize → classify/summarize → write) actually reliable and worth building further on top of?*

### 3.3 Target Architecture (Future, Not Yet Built)

Once the MVP pipeline is proven, the intended production architecture wraps the same logical flow in a proper local application:

```
                 🐾 AI DEVELOPER PET
        ┌─────────────────────────────┐
        │        Tauri 2               │
        │     React + TypeScript       │
        │       Pet / Settings         │
        └──────────────┬───────────────┘
                       │
                  Typed IPC
                       │
        ┌──────────────▼───────────────┐
        │       TypeScript              │
        │       Agent Runtime           │
        │                               │
        │  Context Engine                │
        │  Journal Compiler               │
        │  Policy Engine                  │
        │  LLM Abstraction (model-agnostic)│
        │  Notion Integration              │
        └──────────────┬───────────────┘
                       │
                ┌──────┴──────┐
                │             │
             LLM Layer     Notion API
                │             │
        ┌───────▼───────┐     │
        │ OpenAI/Gemini/│     │
        │ Anthropic/etc.│     │
        └───────────────┘     │
                              │
                       ┌──────▼──────┐
                       │   NOTION     │
                       │  PERMANENT   │
                       │   MEMORY     │
                       └──────────────┘
              Rust privileged core
                       │
              ┌────────┼────────┐
              ↓        ↓        ↓
             Git      IDE      OS
             SQLite (local event buffer — temporary, not permanent memory)
             OS Keychain (credential storage — never exposed to the LLM)
```

**Layer responsibilities:**

| Layer | Role |
|---|---|
| **Tauri + React/TypeScript** | The visible "pet" — a lightweight desktop shell and settings UI |
| **TypeScript Agent Runtime** | Orchestrates everything: decides what context to gather, compiles it into structured journal entries, enforces policy, talks to the LLM and to Notion |
| **Rust privileged core** | The only layer with real OS-level access — reads git, IDE signals, and system activity; nothing above it touches the filesystem directly |
| **SQLite** | A local, temporary event buffer — captures activity continuously throughout the day so nothing is missed, but is explicitly *not* the permanent record |
| **OS Keychain** | Where credentials actually live — never passed into LLM context |
| **Notion API** | The permanent memory — the only place a completed journal entry ultimately lives |

**Why continuous local buffering matters:** the intended trigger model is that capture runs passively and continuously in the background (via the Rust core), while the actual "compile and write to Notion" step can be run manually, on a schedule, or both — since the buffer already holds everything, triggering a write at any point captures the full day, not just recent activity.

### 3.4 Explicitly Out of Scope (At Any Stage)

SaaS infrastructure, user accounts, a mobile app, PostgreSQL/Redis/Kubernetes/Docker, multi-agent systems, vector databases or RAG, autonomous coding, arbitrary shell execution, browser control, and full third-party account integrations (e.g. a connected Pinterest account rather than a public board URL). None of these are required for the core idea to work.
