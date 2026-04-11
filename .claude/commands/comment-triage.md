---
description: Per-thread analysis algorithm for PR review comments — classify, analyze, and produce structured output
allowed-tools: Read,WebFetch,Glob,Grep,Bash
---

# Comment Triage

You are analyzing a single PR review thread. Follow the steps below exactly.

**You have been given:**

- `THREAD` — all comments in the thread (author + body, in order), with thread status (`OPEN` / `OUTDATED`)
- `FILE_CONTENT` — the full file from the PR branch HEAD (not main)
- `FILE_PATH` and `LINE` — location of the comment
- `REPO` and `HEAD_SHA` — GitHub repo (`owner/repo`) and PR branch HEAD commit SHA

---

## Step 0: Research before classifying

Do this before any analysis. Do not skip.

1. **Fetch URLs** — for every URL in any comment body, fetch it with `WebFetch` now. External links are often the crux of the reviewer's concern and may completely change the classification.

2. **Explore related code** — use `Grep` and `Glob` to look beyond the provided file content:
   - Search for related types, interfaces, or symbols mentioned in the thread
   - If the thread is about duplication or shared patterns, grep the local codebase for similar definitions in other files
   - If you need a related file from the PR branch that wasn't provided, fetch it via `WebFetch` using the raw GitHub URL: `https://raw.githubusercontent.com/REPO/HEAD_SHA/FILE_PATH`

3. **Pre-load linear-capture** — if the thread looks like it might be `Todo-later` (explicit deferral language, agreement to open a ticket), read `.claude/commands/linear-capture.md` now, before you need the sizing definitions.

Only proceed once research is complete.

---

## Step 1: Classify the thread

Work through this decision tree in order. Stop at the first match.

1. **Todo-later** — thread contains explicit agreement to defer: words like "follow-up", "next PR", "track this", "open a ticket", "TODO", or replies where both sides agree to defer without resolving now
2. **Question** — primary comment ends with `?`, or contains "why", "what does", "how does", "can you explain", "I don't understand", "what's the rationale" — and is seeking understanding rather than requesting a change
3. **Note** — purely observational: prefixed with "nit:", "minor:", "style:", "fyi", "just noting" — or the comment makes no request and requires no response
4. **Task** — default for everything else: reviewer is requesting a change, pointing out a bug, asking for a refactor, or flagging something that needs fixing

---

## Step 2: Deep analysis by classification

### If Task

Read the file content at the referenced location. Use Grep to find any related patterns that inform how significant the change would be. Then produce:

```
CLASSIFICATION: Task
BLOCKING: yes | no | maybe
  (yes = must fix before merge; no = cosmetic/low-stakes; maybe = depends on use case)
CURRENT_CODE: <1–2 sentences describing what the code does now>
REQUESTED_CHANGE: <what the reviewer is asking for, in concrete terms>
STEELMAN_REVIEWER: <strongest version of the reviewer's concern>
STEELMAN_IMPLEMENTER: <strongest reason the current code might be defensible>
CODE_VERDICT: supports-reviewer | supports-implementer | ambiguous
  (does the actual code support or contradict either side?)
ACTION: <one sentence — fix it / discuss / skip>
```

---

### If Question

Read the file content. Use Grep to search for related code that may answer the question. Determine whether the code itself already answers the question (i.e. the answer is visible in the implementation). Then produce:

```
CLASSIFICATION: Question
QUESTION: <the question being asked, paraphrased>
ANSWERED: yes | no | partial | in-code
  (in-code = the answer is visible in the implementation, just not documented)
CODE_EVIDENCE: <quote or describe the relevant code that answers or fails to answer the question>
STEELMAN_REVIEWER: <why this is worth asking — what concern underlies it>
SHOULD_DOCUMENT: yes | no
DOCUMENT_WHERE: <file:line and what to add — omit if SHOULD_DOCUMENT is no>
ACTION: <one sentence — answer in thread / add comment / no action>
```

---

### If Note

Produce:

```
CLASSIFICATION: Note
OBSERVATION: <one sentence — what the reviewer observed>
ACTION: none
```

---

### If Todo-later

You must have already read `.claude/commands/linear-capture.md` in Step 0. Use its size definitions, field conventions, and label guidance to produce a well-formed draft ticket. Then produce:

```
CLASSIFICATION: Todo-later
AGREED_BY: <who agreed to defer — list authors>
TICKET:
  TITLE: <actionable Linear ticket title>
  SIZE: XS | S | M | L
    (XS < 20 lines; S < 100 lines; M < 250 lines; L < 500 lines — exclude tests)
  LABELS: <from CLAUDE.md label list — type + component if applicable>
  DESCRIPTION: <2–4 sentences: what needs doing, why it was deferred, any constraints>
  CODEBASE_CONTEXT: <relevant file paths, function names, or patterns from the file content>
ACTION: create Linear ticket
```

---

## Output

Return exactly the structured block for your classification. No preamble, no explanation outside the block.
