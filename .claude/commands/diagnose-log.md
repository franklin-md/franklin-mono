---
description: Diagnose a Franklin agent session log for issues, poor context management, and agent mistakes
allowed-tools: Agent,Read,Grep,Glob,Bash(wc:*),Bash(python3:*),Bash(cat:*)
---

# Diagnose Log: Franklin Session Analysis

Analyze a Franklin agent session log (FranklinState JSON) and report findings in chat with severity levels.

The user provides a file path as argument: `$ARGUMENTS`

## Step 1: Read the log

The log file can be very large. Use `python3` via Bash to parse the JSON and extract a structured summary you can work with. Do NOT try to read the raw file with the Read tool if it exceeds size limits.

Run a Python script that:

1. Loads the JSON file
2. Extracts and prints:
   - `core.config` (model, provider, reasoning)
     - If `core.config` is absent, note that explicitly and fall back to `core.llmConfig` only as a compatibility fallback.
   - `core.history.systemPrompt` (first 500 chars, or "[empty]")
   - `env.fsConfig.cwd` and `env.fsConfig.permissions`
   - `env.netConfig`
   - `store` keys and values
   - Total message count by role
   - For each message, a summary line:
     - Role
     - Content block types
     - For `text`/`thinking`: character count and first 120 chars
     - For `toolCall`: tool name, argument keys, and full arguments (truncated to 300 chars)
     - For `toolResult`: character count of the text content
   - Total token estimate (chars / 4) for tool results vs other content

## Step 2: Analyze

Using the extracted summary, evaluate the conversation holistically. Use your own judgement — there is no fixed checklist. Look at the conversation as a whole and identify anything that stands out as problematic, wasteful, or well-done.

For each finding, assign a severity:

- **CRITICAL** — caused task failure, major context waste, or security issue
- **WARNING** — suboptimal behavior that degraded quality or efficiency
- **INFO** — minor observation or suggestion for improvement

Consider dimensions like:

- **Session configuration** — Is the agent set up for success? System prompt, model choice, permissions.
- **Context management** — How efficiently is the finite context window used? Look at the ratio of tool result tokens to reasoning tokens. Identify anything that bloats context without proportional value.
- **Tool strategy** — Did the agent pick the right tools and arguments for what it was trying to do? Were there better approaches available?
- **Reasoning quality** — Does the agent plan, adapt to results, and complete its task? Or does it flail, repeat itself, or abandon the task?
- **Task outcome** — Did the user get what they asked for?

Only report findings you are confident about. Do not invent issues to fill categories — if a dimension looks fine, skip it.

## Step 3: Deep-Dive CRITICAL/WARNING Findings

Before finalizing the report, take every tentative **CRITICAL** and **WARNING** finding and investigate it with a subagent.

- Use the `Agent` tool to launch one cheap/focused subagent per finding, in parallel when possible.
- Give each subagent:
  - the log path
  - the tentative finding title + severity
  - the relevant message indices
  - the exact claim that needs verification
- Instruct each subagent to:
  - verify whether the finding is real or should be downgraded/dropped
  - trace the likely cause as far as possible
  - if the cause appears to map to this local codebase, inspect the relevant implementation with `Grep`/`Glob`/`Read`
  - classify the cause as one of: runtime/tooling issue, prompt/command issue, session config issue, or agent misuse
  - propose a concrete correction if it looks easy/low-risk to solve

Use the subagent output to refine the final writeup. If a subagent cannot support the claim, downgrade it or remove it.

## Step 4: Report

Present the diagnosis in chat using this format:

```
## Session Overview

| Field | Value |
|-------|-------|
| Model | ... |
| Provider | ... |
| Reasoning | ... |
| CWD | ... |
| System Prompt | present / empty |
| Messages | N (X user, Y assistant, Z tool results) |
| Tool Calls | N (list tool names with counts) |
| Context Budget | ~N tokens total (~M% tool results) |

## Findings

### [CRITICAL] Title
What happened, why it matters, what should have been done instead.
Root cause trace: ...
Suggested correction: ...

### [WARNING] Title
...
Root cause trace: ...
Suggested correction: ...

### [INFO] Title
...

## Recommendations
Numbered list of the top improvements, ordered by impact.
```

Group findings by severity (CRITICAL first, then WARNING, then INFO). Within each severity, order by impact.

If no issues are found at a given severity level, omit that section.

Be specific and cite message indices (e.g., "message [3]") when referencing specific parts of the conversation.
For CRITICAL/WARNING findings, fold the subagent investigation into the final text instead of appending raw subagent transcripts.
