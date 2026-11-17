# Obsidian Plugin

This package contains the Obsidian Franklin agent window.

It depends on Franklin workspace packages for shared UI, agent runtime, and
platform bindings. The plugin currently registers a view and wires Obsidian
filesystem/platform integration inside the plugin runtime.

## Source Layout

- `src/main.ts` owns the Obsidian plugin lifecycle and guards asynchronous startup against unload.
- `src/plugin/` contains runtime construction and global settings/credentials.
- `src/apps/chat/` contains Chat registration, extensions, sessions, UI, viewing context, and Chat settings.
- `src/shared/obsidian/` contains filesystem, path, auth, wikilink, and settings-opening helpers.
- `src/shared/agent/` contains the Obsidian platform adapter and PDF screenshot renderer.
- `src/shared/ui/` contains React mounting, portals, host context, and Obsidian setting primitives.
- `src/shared/diff/` contains the existing diff review controllers, editor integration, and styles.
- [`src/shared/directives/`](src/shared/directives/README.md) contains persisted inline directives, Live Preview/Reading adapters, and reference discovery/replacement.
- [`src/shared/obsidian/markdown/`](src/shared/obsidian/markdown/README.md) contains current-content note reads and editor/disk editing operations.
- [`src/shared/ui/editor-popover/`](src/shared/ui/editor-popover/README.md) contains editor anchoring, focus, and popup lifecycle helpers composed with the shared popover controls.

Plugin startup restores `<plugin-dir>/directives.json` before registering the
directive adapters. Unload rejects new registry writes and drains accepted saves.
This infrastructure does not register app-specific directives or run jobs;
unknown references remain readable text. Instance garbage collection is deferred.

## Settings

- **General** contains Chat defaults such as sharing open notes with new agents.
- **Connections** contains the existing provider credentials and ChatGPT sign-in controls. Requests to configure credentials open this tab directly.
- Switching sections keeps their React state, including OAuth feedback. Inactive panels are hidden from keyboard navigation and assistive technology. Closing settings unmounts the page; reopening remembers the last section for the current plugin instance.

Franklin text-size utilities follow Obsidian's text-size preference. Obsidian's native aria-label hover tooltips are suppressed within Franklin views and portals; accessible labels remain intact.

The startup guard prevents late host registration after unload and safely handles unloading before initialization finishes. Application-wide agent shutdown retains the SDK's existing behavior: `FranklinApp` currently has no shutdown method. No session-removal calls are used for plugin cleanup.

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

Copy `dist/main.js` together with `manifest.json` and `styles.css` into any
vault plugin directory, for example:

```text
/path/to/YourVault/.obsidian/plugins/franklin
```

You can also have the bundle script copy files for you by passing the vault
directory:

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

## Develop

Use watch mode to rebuild automatically:

```bash
npm run dev
```

That watches and rebuilds `src/main.ts` into `dist/`.

If you pass `--vault-dir=...`, the same command also copies the plugin files
into that vault after each successful rebuild:

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

When `--vault-dir` or `--plugin-dir` is configured, the sync step also makes a
best-effort attempt to run:

```bash
obsidian plugin:reload id=franklin
```

The reload is scoped to the target vault by running the CLI from that vault
directory. This applies to both `npm run dev` and one-off `bundle` runs that
sync into a vault. If the Obsidian CLI is unavailable, the vault cannot be
inferred, or the reload command fails, the build only prints a warning and you
can reload the plugin manually inside Obsidian.

## Build Matrix

| Script          | Mode | Watch | Sourcemaps | Minified | CSS optimized |
| --------------- | ---- | ----- | ---------- | -------- | ------------- |
| `bundle`        | dev  | no    | yes        | no       | yes           |
| `bundle:prod`   | prod | no    | no         | yes      | yes           |
| `dev`           | dev  | yes   | yes        | no       | no            |

`--vault-dir` and `--plugin-dir` flags work with all three scripts.

Dev builds (`bundle` and `dev`) initialize React Scan before the plugin mounts
React roots so render highlights and the toolbar are available while profiling
inside Obsidian. Production bundles (`bundle:prod`) do not include React Scan.

## Storybook

Run the Obsidian component stories locally:

```bash
npm run storybook
```

Build the static Storybook:

```bash
npm run build-storybook
```

The Storybook toolbar includes an Obsidian theme selector for the built-in
`theme-light` and `theme-dark` body classes. Storybook imports a checked-in
snapshot of Obsidian's default host CSS variables from
`.storybook/obsidian-default-theme-vars.css`, then runs the existing plugin
bundle script before startup, serves `dist/styles.css`, and loads it after the
Storybook host CSS so token flow matches Obsidian: host variables first,
Franklin's Obsidian bridge second.

Refresh the default variable snapshot only when intentionally updating the
Obsidian baseline:

```bash
npm run extract-obsidian-theme-vars -w @franklin/obsidian -- /path/to/app.css --version=<obsidian-version>
```

The extractor keeps custom property declarations from Obsidian's global default
theme selectors such as `:root`, `body`, `.theme-light`, and `.theme-dark`, so
documented editor variables like `--link-color` are available in Storybook
without requiring each developer to extract Obsidian assets locally.

For full correctness, Storybook should eventually implement or load Obsidian's
own component layer so Franklin's reset layer is tested against the same native
button, input, select, and textarea styles that Obsidian applies.

## Notes

- The plugin renders a Franklin conversation window inside an Obsidian view, with compact agent tabs for switching sessions.
- Franklin application state is stored in the plugin directory itself (`<plugin-dir>/`).
- Agent filesystem reads deny `.env` files and the vault's Obsidian config directory.
- Agent filesystem writes are limited to the vault root and the OS temp directory, with the vault's Obsidian config directory denied again.
- This package uses React, Tailwind, and Obsidian APIs.
- `styles.css` is generated from `src/styles/globals.css`.
- `dist/` is generated output and should not be edited by hand.
