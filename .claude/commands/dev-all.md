---
description: End-to-end execution from Linear ticket to tested, quality code - resource intensive, multi-agent
allowed-tools: Task,Read,Write,Edit,MultiEdit,Glob,Grep,LS,WebFetch,WebSearch,EnterPlanMode,ExitPlanMode,NotebookEdit,NotebookRead,TodoWrite,TodoRead,TaskCreate,TaskGet,TaskUpdate,TaskList,Skill,mcp__linear__*,mcp__playwright__*
---

# Ship: Full-Cycle Execution

Take a Linear issue from specification to tested, production-ready code. This skill is designed to be resource-intensive—it spins up multiple agents in parallel for deep analysis at every phase.

**Linear issue: $ARGUMENTS**

> **IMPORTANT**: This skill NEVER commits. The user controls their own git history.

---

## Safety Rules

These rules apply to this skill and ALL agents it spawns. Violations are unacceptable.

### Bash: ALLOWED

- Running tests (`npm run test`, `npx vitest`, etc.)
- Running linters and formatters (`npm run lint`, `npm run format`, `npm run build`, etc.)
- Running type checkers (`npm run typecheck`, `tsc --noEmit`, etc.)
- `git status`, `git diff`, `git log`
- `ls`, `pwd`, `which` (for quick checks only—prefer Read tool)
- Build commands (`npm run build`, etc.)

### Bash: NEVER ALLOWED

- `git commit`, `git push`, `git pull`, `git fetch`
- `git reset`, `git checkout .`, `git restore`, `git clean`, `git stash`
- `git rebase`, `git merge`, `git cherry-pick`
- `rm`, `rm -rf`, `unlink` — never delete files via bash
- Any command that modifies git history or working tree state
- Any command that installs global packages
- Any network requests (curl, wget) outside of test runners

---

## Phase 1: Setup & Context Gathering

Launch these tasks **in parallel**:

### Agent 1: Linear & Context Setup

- Fetch the Linear issue details (title, description, comments, attachments, labels)
- If there are images in the issue description or comments, extract and view them
- Note the issue ID for branch naming (format: `fra-XXX-kebab-case-description`)
- Update Linear issue status to "In Progress"

### Agent 2: Project Environment Analysis

- Read all CLAUDE.md files in the current worktree
- Confirm TypeScript/Node.js project with Vitest for testing, ESLint + Prettier for lint/format
- Identify test patterns: `__tests__/*.test.ts` convention, vitest
- Confirm ESM-only project — imports require `.js` extensions
- Verify LSP configuration is appropriate

### Agent 3: Codebase Structure Scan

- Map the high-level package structure (packages/\*)
- Identify key architectural patterns (bottom-up: lib → transport → mini-acp → extensions → agent)
- Find the main entry points and module boundaries
- Catalog existing test locations and patterns
- Note any relevant configuration files

**Wait for all agents to complete.** Synthesize findings into a brief context summary.

---

## Phase 2: Deep Codebase Analysis

Using the Linear issue spec and Phase 1 context, launch **two sequential passes**:

### Pass 1: Specification Grounding (parallel agents)

**Agent A: Spec-to-Code Mapping**

- Read the full issue spec (description, comments, acceptance criteria)
- Search the codebase for every entity, component, function, and concept mentioned in the spec
- For each, note: current behavior, file location, dependencies
- Identify any ambiguities or gaps between the spec and existing code

**Agent B: Dependency & Impact Tracing**

- For each file/component identified in Agent A's work, trace:
  - What imports it (consumers)
  - What it imports (dependencies)
  - Related test files
- Build a mental model of the blast radius of changes

### Pass 2: Change Location Mapping

- Using combined output from Pass 1, determine the **exact files and functions** that need modification
- Categorize changes:
  - **New code**: files/functions to create
  - **Modifications**: existing code to change
  - **Deletions**: code to remove
  - **Tests**: existing tests that will be affected
- Identify the optimal order of implementation (dependencies first)

---

## Phase 3: Present Implementation Plan

### Refactoring Analysis (parallel agents)

Before presenting the plan, analyze refactoring opportunities:

**Agent R1: Code Duplication Analysis**

- Search for duplicated logic across the files identified for change
- Identify opportunities to extract shared utilities
- Note any copy-paste patterns that should be consolidated

**Agent R2: Structure & Organization Analysis**

- Check if any files are too large and should be split
- Identify misplaced code (functions in wrong modules)
- Look for naming inconsistencies
- Spot dead code in the affected areas

### Plan Presentation

Present to the user a comprehensive plan containing:

1. **Context Summary**: What the issue asks for, grounded in actual codebase state
2. **Architecture Decision**: High-level approach and why
3. **Implementation Steps**: Ordered list of specific changes with file paths and line references
4. **Refactoring Recommendations**: From the analysis above, noting which are:
   - **Pre-implementation** (clean up before adding new code)
   - **Post-implementation** (opportunities that emerge from the new code)
5. **Risk Areas**: Anything that could go wrong, edge cases, ambiguities
6. **Questions for the User**: Anything that needs clarification

### **CHECKPOINT: Wait for user approval before proceeding.**

Incorporate all user feedback. Do not continue until explicitly approved.

---

## Phase 4: Implementation

Execute the approved plan using test-driven development:

### For each implementation step:

1. **RED**: Write a failing test that describes the expected behavior
   - Run the test, confirm it fails for the right reason
   - If it passes immediately, the test is wrong—rewrite it

2. **GREEN**: Write the minimal code to make the test pass
   - No extra features, no "while I'm here" improvements
   - Run the test, confirm it passes

3. **REFACTOR**: Clean up while green
   - Apply any pre-implementation refactoring from the plan
   - Keep tests passing throughout

### After all steps complete:

- Run the full set of affected tests (not the entire suite)
- Run linters and formatters (`npm run build && npm run lint && npm run format`)
- Fix any issues

### User Checkpoints During Implementation

**Stop and ask before:**

- Breaking API changes
- Deleting files or significant code
- Schema or interface changes affecting other packages
- Any irreversible operation

---

## Phase 5: Behavior Change & Coverage Analysis

Launch these **in parallel**:

### Agent T1: Behavior Change Inventory

- Analyze the full diff of all changes made
- Catalog every behavior change:
  - New behaviors added
  - Existing behaviors modified
  - Behaviors removed
  - Side effects or implicit changes
- For each, note whether it was explicitly requested in the spec or is a consequence

### Agent T2: Affected Test Discovery

- Use import/dependency tracing to find ALL existing tests that touch changed code
- Run these tests to confirm they still pass
- If any fail, categorize:
  - **Expected failure** (behavior intentionally changed) → needs test update
  - **Unexpected failure** (regression) → needs investigation

### Agent T3: Coverage Gap Analysis

- Compare the behavior change inventory against existing test coverage
- Identify behaviors that are:
  - **Covered**: existing tests verify this behavior
  - **Partially covered**: tests exist but don't cover edge cases
  - **Uncovered**: no tests verify this behavior
- Prioritize gaps by risk (user-facing > internal, complex > simple)

**Wait for all agents.** Synthesize into a testing report.

---

## Phase 6: Testing Plan

Present to the user:

1. **Behavior Changes Summary**: What changed and why
2. **Existing Test Results**: Which passed, which need updates
3. **Coverage Gaps**: Ordered by priority
4. **Proposed New Tests**: For each gap:
   - Test description
   - What behavior it verifies
   - Test type (unit, integration)
   - File location
5. **Test Updates Needed**: Existing tests that need modification

### **CHECKPOINT: Wait for user approval of testing plan.**

---

## Phase 7: Execute Testing Plan

### For each test in the approved plan:

1. Write the test
2. Run it—confirm expected result (pass for coverage tests, initially fail then fix for regression tests)
3. If a test reveals an actual bug, flag it to the user immediately

### After all tests:

- Run the full affected test suite
- Run `npm run build && npm run lint && npm run format`
- Confirm everything is green

---

## Phase 8: Final Quality Pass

### Present a summary:

1. **What was implemented**: Brief description tied to the original spec
2. **Files changed**: List with brief descriptions of changes
3. **Test coverage**: New and updated tests
4. **Refactoring applied**: What was cleaned up
5. **Remaining refactoring opportunities**: Things that could be improved but were out of scope
6. **Known limitations or follow-ups**: Anything the user should be aware of

> The user will handle committing, pushing, and PR creation themselves.
