import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const entries = [
	// TODO: franklin/agent should be platform agnostic
	['@franklin/agent/browser', 'packages/agent/src/browser.ts'],
	['@franklin/agent', 'packages/agent/src/index.ts'],
	['@franklin/electron/main', 'packages/electron/src/main/index.ts'],
	['@franklin/electron/preload', 'packages/electron/src/preload/index.ts'],
	['@franklin/electron/renderer', 'packages/electron/src/renderer/index.ts'],
	['@franklin/react', 'packages/ui/react/src/index.ts'],
	['@franklin/react/browser', 'packages/ui/react/src/browser.ts'],
	['@franklin/ui', 'apps/shared/ui/src/index.ts'],
	['@franklin/node', 'packages/node/src/index.ts'],
	['@franklin/lib/transport/node', 'packages/lib/src/transport/node.ts'],
	['@franklin/lib/transport', 'packages/lib/src/transport/index.ts'],
	['@franklin/lib/proxy', 'packages/lib/src/proxy/index.ts'],
	['@franklin/lib/middleware', 'packages/lib/src/middleware/index.ts'],
	['@franklin/lib', 'packages/lib/src/index.ts'],
	['@franklin/extensions', 'packages/extensions/src/index.ts'],
	['@franklin/mini-acp', 'packages/mini-acp/src/index.ts'],
] as const;

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Vitest resolves these packages to workspace source during tests. These
// aliases must be exact-match regexes because simple string aliases are prefix
// matches in Vite, which would incorrectly rewrite subpaths such as
// `@franklin/lib/transport` through the `@franklin/lib` entry.
function aliasEntry(find: string, replacement: string) {
	return {
		find: new RegExp(`^${escapeRegex(find)}$`),
		replacement: path.resolve(rootDir, replacement),
	};
}

export function franklinVitestAliases() {
	return entries.map(([find, replacement]) => aliasEntry(find, replacement));
}
