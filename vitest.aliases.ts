import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const entries = [
	['@franklin/lib/transport/node', 'packages/lib/src/transport/node.ts'],
	['@franklin/lib/transport', 'packages/lib/src/transport/index.ts'],
	['@franklin/lib/proxy', 'packages/lib/src/proxy/index.ts'],
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
