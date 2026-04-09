---
description: Quick capture for new Linear issues when problems are identified
allowed-tools: mcp__linear__*,Agent,Grep,Read,LS,Glob
---

# Linear: Capture New Issue

Capture task: $ARGUMENTS

## Workflow

1. **Parse Task Description**:
   - Extract core problem/feature request from the arguments
   - The user may describe one or more issues — split them into separate tickets if needed

2. **Fetch Context** (do these in parallel):
   - List all teams via `list_teams`
   - List all projects via `list_projects`
   - List all labels via `list_issue_labels`
   - Search for related existing issues in Linear

3. **Research Each Ticket** (use Agent tool with `model: "haiku"` subagents):
   - For each proposed ticket, launch a haiku subagent in parallel to:
     - Search the codebase for relevant files and patterns (Grep, Glob, Read)
     - Identify the scope of the problem/feature
     - Suggest implementation notes and affected areas
     - Check for any related code TODOs or existing workarounds
   - Collect the subagent results — these will enrich the ticket descriptions

4. **Propose Issues** — present ALL suggestions to the user in chat, do NOT create yet:
   - Use a summary table per group with these columns: **#**, **Title**, **Size**, **Project**, **Label**, **Description**
   - Project column should always be present — use "(none)" if no project fits
   - For each ticket, show:
     - **Team**: Suggest based on context, show all available teams
     - **Project**: Suggest if one fits, show "(none)" if not applicable
     - **Status**: Triage
     - **Title**: Clear, actionable description
     - **Description**: Include context, reasoning, and codebase findings from the research step
     - **Size estimate**: 
       - XS: < 20 lines changed/added. Easy for an agent to complete by itself
       - S: < 100 lines. An agent can complete by itself, but with lots of review by user.
       - M: < 250 lines. The problem needs to be broken into phases.
       - L: < 500 lines. The problem needs to be planned deeply and likely split into sub issues.
     - **Labels**: Choose from the labels fetched in step 2
     - **Codebase context**: Key files, related code, implementation hints from research
     - Note any duplicates or related existing issues found

5. **Wait for Approval**:
   - Present proposals as a formatted list in the chat message
   - Wait for the user to respond with feedback, modifications, or approval
   - Incorporate any changes the user requests
   - Only proceed to creation after explicit user approval in chat

6. **Create Issues** (only after approval):
   - Create each approved issue with the finalized details
   - Add implementation suggestions as comment
   - Link related issues
   - Note any dependencies or blockers

## Notes
- NEVER create issues without user approval — always propose first
- NEVER use AskUserQuestion — communicate proposals and get feedback via chat messages
- Use haiku subagents for codebase research to keep costs low and speed high
- Focus on quick capture enriched with codebase context
- User will triage and prioritize later
- Keep descriptions concise but complete
