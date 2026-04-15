# Obsidian Plugin

This package is the current Obsidian placeholder plugin for Franklin.

It does not depend on any Franklin runtime packages yet. The plugin just
registers a view and opens a minimal placeholder panel inside Obsidian.

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
2. Click the ribbon icon, or run `Open Franklin Placeholder` from the command palette.

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

After each rebuild, reload the plugin inside Obsidian to pick up the latest code.

## Build Matrix

| Script          | Mode | Watch | Sourcemaps | Minified | CSS optimized |
| --------------- | ---- | ----- | ---------- | -------- | ------------- |
| `bundle`        | dev  | no    | yes        | no       | yes           |
| `bundle:prod`   | prod | no    | no         | yes      | yes           |
| `dev`           | dev  | yes   | yes        | no       | no            |

`--vault-dir` and `--plugin-dir` flags work with all three scripts.

## Notes

- This package currently uses React, Tailwind, and Obsidian APIs.
- `styles.css` is generated from `src/styles/globals.css`.
- `dist/` is generated output and should not be edited by hand.
