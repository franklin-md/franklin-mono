// Runtime stub for the obsidian module (types-only package with no JS entry).
// Used as a Vite alias in vitest.config.ts so imports resolve at test time.

export class FileSystemAdapter {
	getBasePath(): string {
		return '';
	}
}

export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/|\/$/g, '');
}
