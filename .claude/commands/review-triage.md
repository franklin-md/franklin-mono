---
description: Triage open PR review threads into tasks, questions, and todos with deep per-thread analysis
allowed-tools: all
---

# PR Review Triage

Triage open and closed review threads on a pull request. Classify each thread, analyze it deeply, and compile findings into an actionable report.

**Input**: `$ARGUMENTS` is a PR reference — either `owner/repo#123` or a full GitHub URL. If omitted, use the current branch's open PR.

---

## Phase 1: Resolve the PR

Parse `$ARGUMENTS` to extract the repo (`owner/repo`) and PR number. If not provided, run `gh pr view --json number,headRepository` to get the current branch's PR.

---

## Phase 2: Fetch thread data (parallel)

Run these two calls in parallel:

**A. Review threads via GraphQL** — get all threads with resolution/outdated status:

```
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: NUMBER) {
      title
      headRefName
      headRefOid
      reviewThreads(first: 100) {
        nodes {
          isResolved
          isOutdated
          comments(first: 20) {
            nodes {
              path
              originalLine
              body
              author { login }
              createdAt
            }
          }
        }
      }
    }
  }
}'
```

**B. PR file list**:

```
gh pr view NUMBER --repo owner/repo --json files,headRefName,headRefOid
```

From the GraphQL result, tag each thread:

- `OPEN` — not resolved, not outdated
- `OUTDATED` — code changed since comment (note but skip deep analysis)
- `RESOLVED` — already closed (skip entirely)

---

## Phase 3: Read relevant files

For each `OPEN` thread, fetch the file content from the PR branch HEAD using the blob API:

1. Get the tree: `gh api 'repos/owner/repo/git/trees/HEAD_SHA?recursive=1'`
2. For each file path referenced by an OPEN thread, get the blob SHA from the tree, then fetch: `gh api 'repos/owner/repo/git/blobs/BLOB_SHA' --jq '.content' | base64 -d`

Fetch all files in parallel.

---

## Phase 4: Spawn per-thread Haiku agents (parallel)

Group threads by file. For each group (or individual thread if on different files), spawn one **Haiku** agent with `model: haiku`.

Each agent prompt must:

1. **Open with this exact sentence**: "Read `.claude/commands/comment-triage.md` and follow it exactly — that file is your complete specification."
2. **Provide THREAD data**: all comments (author + body, in order) and thread status (`OPEN` / `OUTDATED`)
3. **Provide FILE_CONTENT**: the full file from the PR branch HEAD (fetched in Phase 3)
4. **Provide FILE_PATH and LINE**: exact location of each comment
5. **Provide REPO and HEAD_SHA**: so the agent can fetch related files via WebFetch if needed (raw URL: `https://raw.githubusercontent.com/REPO/HEAD_SHA/FILE_PATH`)

Do NOT define an output schema in the agent prompt — `comment-triage.md` owns the schema. The agent will return the structured block defined there.

Run all agents in parallel.

---

## Phase 5: Synthesize and present

Collect all agent outputs. Parse the `CLASSIFICATION` field from each block and sort into sections. Present:

```
## PR #N Review Triage: [title]

### Outdated threads (skipped)
- List any OUTDATED threads briefly — file:line and first comment, one line each.

---

### Tasks

Blocking tasks first, then non-blocking.

For each Task thread:
**`file.ts:line`** — [one-line summary of requested change] [BLOCKING | non-blocking | unclear]
- **Current code**: [CURRENT_CODE]
- **Requested**: [REQUESTED_CHANGE]
- **For reviewer**: [STEELMAN_REVIEWER]
- **For implementer**: [STEELMAN_IMPLEMENTER]
- **Verdict**: [CODE_VERDICT]
- **Action**: [ACTION]

---

### Questions

For each Question thread:
**`file.ts:line`** — [paraphrased question] [answered | unanswered | in-code]
- **Evidence**: [CODE_EVIDENCE]
- **For reviewer**: [STEELMAN_REVIEWER]
- **Document**: [DOCUMENT_WHERE, or "no"]
- **Action**: [ACTION]

---

### Todos for later

| Title | Size | Labels | Context |
| ----- | ---- | ------ | ------- |
| ...   | S    | ...    | ...     |

---

### Notes (no action needed)
- `file.ts:line` — [OBSERVATION]
```

---

## Phase 6: Offer next steps

After presenting the report, ask the user:

> **Next steps:**
>
> 1. Fix blocking tasks in this PR
> 2. Create Linear tickets for Todos
> 3. Both
> 4. Done

If the user chooses to create Linear tickets, invoke `/linear-capture` with each Todo item's draft ticket data (title, size, labels, description, codebase context). The linear-capture workflow handles proposal, approval, and creation.

---

## Notes

- Skip RESOLVED threads entirely — don't resurface closed discussions
- For OUTDATED threads, list them briefly so the user knows they existed, but skip deep analysis
- For disputed threads (reviewer and implementer disagree, neither resolved), always show both steelmans — never pick a winner without CODE_VERDICT support
- File content must always come from the PR branch HEAD, not main
- Keep each section scannable — no paragraph prose, bullet points only
