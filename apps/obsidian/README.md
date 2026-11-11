# Obsidian Plugin

This package contains the Franklin Obsidian plugin and its Chat and Study inbox apps.

It depends on Franklin workspace packages for shared UI, agent runtime, and platform bindings. The plugin assembles app lifecycles and shared Obsidian filesystem/platform integration.

## Source organization

```text
src/
  main.ts                  Obsidian plugin entry point and lifecycle
  plugin/
    bootstrap.ts           Shared service creation and app startup
    settings/              Global settings and composition of app sections
  apps/
    chat/                  Chat registration, view, agent configuration, UI and settings
    inbox/                 Inbox registration, queue, agents, UI and settings
      evidence/            Question research and diagnostics shared within Inbox
      capture/             Flashcard recording and Mochi integration
  shared/
    obsidian/              Filesystem, paths, auth storage, wikilinks and host settings API
    agent/                 Obsidian platform factory and reference/PDF capabilities
    ui/                    React mounting, portals, host context and setting primitives
    diff/                  Editor and explorer integration for reviewing agent writes
  styles/                  Global theme bridge, reset and stylesheet entry point
  mocks/                   Obsidian test and Storybook mocks
  dev/                     Development instrumentation
```

The plugin assembly imports apps and shared capabilities. Apps may import shared
code and Franklin packages; shared code must not depend on app internals. Keep
app-specific state, settings, styles, tests and stories beside their owner. Move
code into shared when another app uses the same capability. Cross-host UI and
runtime implementations continue to belong in the existing workspace packages.

Apps register through ordinary functions. The plugin assembles their settings
sections and owns their lifetime; unmounting a pane only disposes its UI. Inbox
work and flashcard recording therefore survive closing the Inbox pane. Chat keeps
its persisted session collection, while Inbox creates independent agents through
`FranklinApp.createAgent()`. See the [agent lifecycle contract](../../packages/agent/README.md#extensions).

Source reorganization does not move saved data: chat sessions, `inbox.json`,
`capture.json`, `inbox-research/` and `diff-cache.json` retain their existing paths
inside the plugin directory. Capture remains an Inbox feature and research
records remain specific to Inbox questions.

Inbox component styling uses Tailwind classes. Its small `ui/styles.css` owns
host-container and reduced-motion rules; `styles/globals.css` imports that file,
Inbox action settings styles and shared diff styles. Tailwind scans all of `src/`,
including each app. Feature tests live in their existing `__tests__` folders and
Storybook discovers colocated `*.stories.tsx` files recursively.

## Requirements

- Node 22+
- Obsidian desktop if you want to load the plugin inside Obsidian

## Install Dependencies

From this package:

```bash
cd apps/obsidian
npm install
```

## Build

TypeScript build:

```bash
npm run build
```

Bundle the plugin into `dist/` (dev — sourcemaps, no minification):

```bash
npm run bundle
```

Production bundle (minified, no sourcemaps, `NODE_ENV=production`):

```bash
npm run bundle:prod
```

Both write:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

## Run In Obsidian

Copy `dist/main.js` together with `manifest.json` and `styles.css` into any vault plugin directory, for example:

```text
/path/to/YourVault/.obsidian/plugins/franklin
```

You can also have the bundle script copy files for you by passing the vault directory:

```bash
npm run bundle -- --vault-dir=/path/to/YourVault
```

Or pass the plugin directory explicitly:

```bash
npm run bundle -- --plugin-dir=/path/to/YourVault/.obsidian/plugins/franklin
```

Then in Obsidian:

1. Enable the `Franklin` community plugin.
2. Click the ribbon icon, or run `Franklin: Open chat window` from the command palette.

## Settings

Franklin settings has four tabs:

| Tab | Settings |
| --- | --- |
| General | Open-note context sharing and document download limits |
| Inbox | Reasoning, answer instructions, selection shortcut and reusable actions |
| Flashcards | Capture collection folder and Mochi database path |
| Connections | Provider accounts/API keys |

The tab bar stays visible while scrolling and scrolls horizontally in narrow windows.
Tabs support keyboard navigation. Switching tabs preserves unfinished form edits;
closing settings discards unsaved drafts. The selected tab is remembered until the
plugin reloads. Inbox preferences open Inbox directly, and credential setup from
chat or Inbox opens Connections.

## Study inbox

Use the inbox ribbon icon or **Franklin: Open study inbox**. Select a model and configure its credentials in Franklin settings (also accessible from inbox options). Type a question, then press Enter. Answers arrive in the background. New answers show the shortest useful direct response, with optional supporting details collapsed into individually expandable sections. Click a question to show its footer with original wording, source info, action buttons and a simple follow-up field; only one question stays focused. The header and answer stay visible when the footer is hidden. Detail sections open independently and retain their state while switching questions. Escape collapses it, and drafts survive switching. New answers include a concise question header; the original wording is available under **Original question** when expanded. Headers wrap within narrow sidebars. Answer text can be selected and copied. Concurrency is configurable in inbox options. Replace the answer instructions in Franklin settings → Inbox, then choose **Save instructions**; **Reset to default** restores a direct answer with optional supporting details. Essential qualifications stay visible; simple answers can be a single word. Existing custom instructions are preserved. Follow-ups, actions and flashcard captures receive all details, including sections you have never opened. Older answers keep their original content and rendering. Saved instructions apply to new questions and follow-ups; retries retain their original instructions. Typed/pasted questions capture the most recently active note; selected tasks also carry their heading and parent-list context. Agents can read files and linked notes, search the web, and fetch source pages.

Choose **Franklin settings → Inbox → Reasoning level** to set Off, Minimal, Low, Medium, High or Extra high. Changes save immediately and apply to new questions, follow-ups and inbox actions. Retries keep their original level.

The composer mode pill switches between **Question** and **Thought dump**, retaining your draft and remembering the selected mode. Thought dump runs a background extraction using the selected model and reasoning level, then automatically queues independent sibling questions in one foldable group. It extracts explicit and clearly implied asks, merges duplicates and preserves relevant context; it does not generate a broader research agenda. Follow-ups remain ordinary questions. Extraction uses the shared concurrency limit and continues with the pane closed. Its status shows the original dump, completion count, or an error with **Retry extraction**. Failed initial saves keep the composer draft; later save failures use **Retry save** without duplicating the batch. Queued extractions resume after restart; interrupted ones require retry. Dismiss removes the extraction status; the group retains the original dump as shared context. Inbox storage is now version 6; older plugin builds reject it.

The inbox composer reuses chat's prompt surface, send button and searchable model picker. The picker's **Effort** row below the model list shows all six reasoning choices inline, with the current level marked by a pill. Choosing a level keeps the picker open; arrow keys navigate the choices and Escape closes the picker. The closed picker shows the thinking level beside the model name in muted text at the same font size. Its expanding textarea and compact follow-up field keep inbox-specific drafts and submission behavior. Model and reasoning changes stay independent of chat. See the [UI regression requirements](../../docs/inbox-ui-regressions.md) for the behavior preserved during component reuse and the [picker composition API](../shared/ui/README.md#shared-prompt-controls) for custom layouts.

Groups have optional titles and retain their folded state across reloads. Direct children of groups stay unindented; children of questions indent. Folding keeps question components mounted, preserves drafts and disclosures, and leaves work running. Source-pill navigation reveals folded ancestor groups. Follow-ups use fresh agents with saved ancestor Q&As and group context; sibling answers are excluded. Relationships are created programmatically; see the [hierarchy operations](../../docs/inbox-prototype.md#groups-and-children).

Each question card composes a header, body and footer. The footer accepts separate info and controls slots and stays mounted while hidden to preserve follow-up drafts and disclosure state.

Inbox layout and state styling use Tailwind and Franklin's shared Button, IconButton, Badge, StatusDot and Select components. Appearance follows the existing Obsidian-to-Franklin theme bridge. The only Inbox CSS handles host view containment, box sizing without preflight, and reduced motion; see the [styling verification](../../docs/inbox-ui-regressions.md#design-system-styling-verification-on-2026-11-11) for measurements and regression coverage.

Opening or closing a detail section selects its question and keeps it selected. Question titles and section headings can be selected and copied. Each question also has a **Debug** button that copies a JSON report for diagnosis: its current attempt, source/ancestor context, instructions, answer or error, saved research, and available agent events. Future attempts retain a bounded timeline of turn boundaries, complete message updates and tool calls/results. Credentials are redacted; reasoning content, binary bodies and streaming chunks are omitted. Older questions report unavailable events explicitly.

Run **Franklin: Add selection to study inbox** in a Markdown note to submit it immediately. With just a cursor or a selection of up to three non-whitespace characters, it sends the entire current row; longer selections send only the selected text. Blank rows are ignored. Use Franklin settings → Inbox → Configure shortcut to open the native hotkey editor, then assign keys such as Cmd/Ctrl+Shift+I. The command appends a compact inline question pill to the last selected line. It shows Queued, a Thinking spinner, View answer, or an error state; clicking it opens Inbox, selects and expands that exact question, and scrolls to it. Pills render in Live Preview and Reading mode; Source mode shows their Markdown tokens. Existing tokens are excluded from the submitted question. Removing a pill leaves its question running in Inbox. Deleting an Inbox question removes all copies of its pill across notes after the deletion saves; failed note cleanup is reported and retried on subsequent saves or restart. Directive associations persist separately in `<plugin-dir>/directives.json`. Source quotes remain attached to follow-ups. Select a question, then click anywhere on its footer source row, marked with a small arrow icon, to open its note at the original passage. The captured quote is retained for navigation and agent context but is not rendered in the card. Source names can still be selected and copied. Navigation first finds the exact text, then a unique line starting with the quote's first nonblank line ignoring whitespace, then the line with the longest common subsequence of the quote ignoring whitespace. Equal matches prefer the saved line. The note still opens when no passage matches.

Hover **View answer** for a formatted answer preview, including expandable details, in Live Preview or Reading mode. It opens centered above the pill, adjusting to screen edges, and grows up to 36rem within the available space. The fixed header shows the question title, an Inbox button for follow-ups, and quick delete; the answer scrolls beneath it. Delete removes the question and its follow-ups, and saved deletion removes all copies of its pill. It opens after a short delay and stays open while the pointer or keyboard focus is inside. Keyboard focus on the pill opens the preview immediately; Tab moves into its controls and Escape dismisses it. Hovering preserves editor focus. Clicking the pill still opens that exact question in Inbox.

- [ ] Follow-up: compose and submit follow-up questions directly inside the answer preview.

Configure reusable name/prompt actions in **Franklin settings → Inbox → Inbox actions**. Selected answered questions show action buttons in the footer; each action runs with the question, answer and source context, and can read workflow prompts, edit files and run commands. Only one run per action/question can be outstanding. Success removes the temporary run; failures offer Retry/Dismiss. See the [inbox guide](../../docs/inbox-prototype.md#configurable-actions) for a 🃏 flashcard configuration.

Questions, action definitions, outstanding action runs and preferences persist in `<plugin-dir>/inbox.json`. The queue keeps running when its pane is closed. On restart, queued questions resume and interrupted requests offer Retry. Inbox agents do not save chat transcripts or per-agent stores. Future question attempts save bounded, credential-redacted research evidence separately in `<plugin-dir>/inbox-research/`. See [the inbox guide](../../docs/inbox-prototype.md) for storage, error handling, tests, and current limitations.

## Flashcard capture

An answered question has **Record** / **Stop** controls. Record, author and save cards directly in Mochi, then Stop or click Record on another answer. The previous recording finishes automatically: matching saved cards go into one episode file, and an empty recording creates no episode. Obsidian notifications report recording start, completion/card count, and an empty result. Failed reads or writes show an error notification and a **Retry recording** control; a failed completion preserves the previous recording rather than replacing it.

Record remembers Mochi's open drafts, including the blank card opened automatically by Save and New. Newly created saved cards and remembered drafts saved during the recording are collected. Unfinished drafts and edits to older saved cards are excluded. There is no review or confirmation step. Timestamp matching provides association only; recordings should cover the cards intended for that answer.

**Franklin settings → Flashcards → Capture** configures the vault-relative collection folder (default `Flashcard Training Examples`) and local database path. The default database is `~/Library/Application Support/mochi/mochi.db`. This personal macOS build uses Obsidian's bundled `node:sqlite`, verified with Obsidian 1.14.4 / Electron 39 / Node 22.22. It opens Mochi read-only, with no API key or writes to Mochi.

One active or incomplete recording is allowed at a time. Switching uses the click time as both the old exclusive end and the new start. It survives reload in `<plugin-dir>/capture.json`; the capture panel stays available even if its inbox question is deleted. Each completed episode is one `<collection-folder>/<episode-id>.json` file containing `captureVersion: 6`, pinned context and research, the draft baseline and matching provenance, automatically captured cards, and the unfiltered snapshot history. Failed saves remain incomplete and retry the same episode. Older answers explicitly mark unavailable original research. Attachment references are retained; binary assets are not copied. See [capture storage and recovery](../../docs/inbox-prototype.md#flashcard-training-capture).

## Develop

Use watch mode to rebuild automatically:

```bash
npm run dev
```

That watches and rebuilds `src/main.ts` into `dist/`.

If you pass `--vault-dir=...`, the same command also copies the plugin files into that vault after each successful rebuild:

```bash
npm run dev -- --vault-dir=/path/to/YourVault
```

You can also pass the plugin directory explicitly:

```bash
npm run dev -- --plugin-dir=/path/to/YourVault/.obsidian/plugins/franklin
```

That does two things:

- watches and rebundles `src/main.ts`
- copies `main.js`, `manifest.json`, and `styles.css` into the configured vault plugin directory

When `--vault-dir` or `--plugin-dir` is configured, the sync step also makes a best-effort attempt to run:

```bash
obsidian plugin:reload id=franklin
```

The reload is scoped to the target vault by running the CLI from that vault directory. This applies to both `npm run dev` and one-off `bundle` runs that sync into a vault. If the Obsidian CLI is unavailable, the vault cannot be inferred, or the reload command fails, the build only prints a warning and you can reload the plugin manually inside Obsidian.

## Build Matrix

| Script        | Mode | Watch | Sourcemaps | Minified | CSS optimized |
| ------------- | ---- | ----- | ---------- | -------- | ------------- |
| `bundle`      | dev  | no    | yes        | no       | yes           |
| `bundle:prod` | prod | no    | no         | yes      | yes           |
| `dev`         | dev  | yes   | yes        | no       | no            |

`--vault-dir` and `--plugin-dir` flags work with all three scripts.

Dev builds (`bundle` and `dev`) initialize React Scan before the plugin mounts React roots so render highlights and the toolbar are available while profiling inside Obsidian. Production bundles (`bundle:prod`) do not include React Scan.

## Storybook

Run the Obsidian component stories locally:

```bash
npm run storybook
```

Build the static Storybook:

```bash
npm run build-storybook
```

The Storybook toolbar includes an Obsidian theme selector for the built-in `theme-light` and `theme-dark` body classes. Storybook imports a checked-in snapshot of Obsidian's default host CSS variables from `.storybook/obsidian-default-theme-vars.css`, then runs the existing plugin bundle script before startup, serves `dist/styles.css`, and loads it after the Storybook host CSS so token flow matches Obsidian: host variables first, Franklin's Obsidian bridge second.

Refresh the default variable snapshot only when intentionally updating the Obsidian baseline:

```bash
npm run extract-obsidian-theme-vars -w @franklin/obsidian -- /path/to/app.css --version=<obsidian-version>
```

The extractor keeps custom property declarations from Obsidian's global default theme selectors such as `:root`, `body`, `.theme-light`, and `.theme-dark`, so documented editor variables like `--link-color` are available in Storybook without requiring each developer to extract Obsidian assets locally.

For full correctness, Storybook should eventually implement or load Obsidian's own component layer so Franklin's reset layer is tested against the same native button, input, select, and textarea styles that Obsidian applies.

## Notes

- The plugin renders a Franklin conversation window inside an Obsidian view, with compact agent tabs for switching sessions.
- Conversation activity is collapsed by default while running and after completion. One current action slides into view as tools change; completed turns show a thinking/tool-count and duration summary. Expand it to inspect the full sequence. Answers and turn errors stay visible. The shared `@franklin/ui` activity disclosure supports other hosts and respects reduced-motion preferences.
- Chat and inbox share Franklin's agent factory and Obsidian platform bindings. Chat supplies its conversational extensions; inbox questions and actions supply their own research and completion extensions through `FranklinApp.createAgent()`. Inbox agents use independent in-memory stores and are disposed after each attempt; chat sessions retain their existing persistence.
- Franklin application state is stored in the plugin directory itself (`<plugin-dir>/`).
- Agent filesystem reads deny `.env` files and the vault's Obsidian config directory.
- Agent filesystem writes are limited to the vault root and the OS temp directory, with the vault's Obsidian config directory denied again.
- This package uses React, Tailwind, and Obsidian APIs.
- `read_file` accepts public HTTP/HTTPS PDF URLs with `selector: "pages=N-M"`. **Franklin settings → General → Document downloads** controls the inactivity timeout (default 60 seconds) and maximum total duration (default 15 minutes). Changes are saved and apply to the next download in existing chat and inbox agents; running transfers retain their initial limits. Each read downloads the complete source document again. Downloads are capped at 64 MiB and PDF output at ten pages per read. HTML pages use `fetch_url`.
- Inbox questions allow the configured maximum download duration plus two minutes for other work, so their overall attempt limit does not stop a healthy first download after two minutes. Action runs retain their longer allowance when it exceeds this budget.
- `styles.css` is generated from `src/styles/globals.css`.
- `dist/` is generated output and should not be edited by hand.
