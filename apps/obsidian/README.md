# Obsidian Plugin

This package contains the Obsidian Franklin agent window.

It depends on Franklin workspace packages for shared UI, agent runtime, and platform bindings. The plugin currently registers a view and wires Obsidian filesystem/platform integration inside the plugin runtime.

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

## Study inbox

Use the inbox ribbon icon or **Franklin: Open study inbox**. Select a model and configure its credentials in Franklin settings (also accessible from inbox options). Type a question, then press Enter. Answers arrive in the background. Click a question to show its full answer and a simple follow-up field; only one stays open. Escape collapses it, and drafts survive switching. New answers include a concise question header; the original wording is available under **Original question** when expanded. Headers wrap within narrow sidebars. Answer text can be selected and copied. Concurrency is configurable in inbox options. Replace the answer instructions in Franklin settings → Study inbox, then choose **Save instructions**; **Reset to default** restores a focused explanation with an example when useful. Saved instructions apply to new questions and follow-ups; retries retain their original instructions. Typed/pasted questions capture the most recently active note; selected tasks also carry their heading and parent-list context. Agents can read files and linked notes, search the web, and fetch source pages.

Choose **Franklin settings → Study inbox → Reasoning level** to set Off, Minimal, Low, Medium, High or Extra high. Changes save immediately and apply to new questions, follow-ups and inbox actions. Retries keep their original level.

Select text in a Markdown note and run **Franklin: Add selection to study inbox** to submit it immediately. Use Franklin settings → Study inbox → Configure shortcut to open the native hotkey editor, then assign keys such as Cmd/Ctrl+Shift+I. Source quotes remain attached to follow-ups and can reopen the original passage.

Configure reusable name/prompt actions in **Franklin settings → Inbox actions**. Answered questions show an action button; each action runs with the question, answer and source context, and can read workflow prompts, edit files and run commands. Only one run per action/question can be outstanding. Success removes the temporary run; failures offer Retry/Dismiss. See the [inbox guide](../../docs/inbox-prototype.md#configurable-actions) for a 🃏 flashcard configuration.

Questions, action definitions, outstanding action runs and preferences persist in `<plugin-dir>/inbox.json`. The queue keeps running when its pane is closed. On restart, queued questions resume and interrupted requests offer Retry. Inbox agents do not save chat transcripts or per-agent stores. Future question attempts save bounded, credential-redacted research evidence separately in `<plugin-dir>/inbox-research/`. See [the inbox guide](../../docs/inbox-prototype.md) for storage, error handling, tests, and current limitations.

## Flashcard capture

An answered question has **Record** / **Stop** controls. Record, author and save cards directly in Mochi, then Stop or click Record on another answer. The previous recording finishes automatically: matching saved cards go into one episode file, and an empty recording creates no episode. Obsidian notifications report recording start, completion/card count, and an empty result. Failed reads or writes show an error notification and a **Retry recording** control; a failed completion preserves the previous recording rather than replacing it.

Record remembers Mochi's open drafts, including the blank card opened automatically by Save and New. Newly created saved cards and remembered drafts saved during the recording are collected. Unfinished drafts and edits to older saved cards are excluded. There is no review or confirmation step. Timestamp matching provides association only; recordings should cover the cards intended for that answer.

**Franklin settings → Flashcard capture** configures the vault-relative collection folder (default `Flashcard Training Examples`) and local database path. The default database is `~/Library/Application Support/mochi/mochi.db`. This personal macOS build uses Obsidian's bundled `node:sqlite`, verified with Obsidian 1.14.4 / Electron 39 / Node 22.22. It opens Mochi read-only, with no API key or writes to Mochi.

One active or incomplete recording is allowed at a time. Switching uses the click time as both the old exclusive end and the new start. It survives reload in `<plugin-dir>/capture.json`; the capture panel stays available even if its inbox question is deleted. Each completed episode is one `<collection-folder>/<episode-id>.json` file containing `captureVersion: 4`, pinned context and research, the draft baseline and matching provenance, automatically captured cards, and the unfiltered snapshot history. Failed saves remain incomplete and retry the same episode. Older answers explicitly mark unavailable original research. Attachment references are retained; binary assets are not copied. See [capture storage and recovery](../../docs/inbox-prototype.md#flashcard-training-capture).

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
- Franklin application state is stored in the plugin directory itself (`<plugin-dir>/`).
- Agent filesystem reads deny `.env` files and the vault's Obsidian config directory.
- Agent filesystem writes are limited to the vault root and the OS temp directory, with the vault's Obsidian config directory denied again.
- This package uses React, Tailwind, and Obsidian APIs.
- `styles.css` is generated from `src/styles/globals.css`.
- `dist/` is generated output and should not be edited by hand.
