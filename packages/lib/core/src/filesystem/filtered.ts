import * as path from 'node:path';
import ignore from 'ignore';
import type { Filesystem } from './types.js';

/**
 * Configuration for filesystem access filtering. This follows
 * the Anthropic Runtime Sandbox model:
 *
 * Read:
 * - default allow;
 * - deny-then-allow;
 *
 * Write:
 * - default deny;
 * - allow-then-deny;
 *
 * Patterns are matched against absolute paths. To allow everything
 * under a directory, use e.g. `/project/**`.
 */
export interface FilesystemPermissions {
	/** Gitignore-style patterns for paths that may be read. */
	denyRead: string[];
	allowRead: string[];
	/** Gitignore-style patterns for paths that may be written. */
	allowWrite: string[];
	denyWrite: string[];
}

function createMatcher(patterns: string[]): (filePath: string) => boolean {
	const ig = ignore().add(patterns);
	return (filePath: string) => ig.ignores(filePath);
}

/**
 * Creates a `Filesystem` that enforces deny-default access control.
 *
 * Paths not matching an allow pattern are rejected. `readdir` and
 * `glob` results are filtered to only include allowed entries.
 *
 * Expects absolute paths (compose after `createFolderScopedFilesystem`).
 */
export function createFilteredFilesystem(
	filter: FilesystemPermissions,
	inner: Filesystem,
): Filesystem {
	const isReadAllowed = createMatcher(filter.allowRead);
	const isReadDenied = createMatcher(filter.denyRead);
	const isWriteAllowed = createMatcher(filter.allowWrite);
	const isWriteDenied = createMatcher(filter.denyWrite);

	function isReadable(absolutePath: string): boolean {
		// Strip leading slash for ignore matching (it expects relative paths)
		const rel = absolutePath.slice(1);

		// Read is deny-then-allow, default allow
		if (isReadAllowed(rel)) {
			return true;
		}
		if (isReadDenied(rel)) {
			return false;
		}
		return true;
	}

	function isWritable(absolutePath: string): boolean {
		const rel = absolutePath.slice(1);

		// Write is allow-then-deny, default deny
		if (isWriteDenied(rel)) {
			return false;
		}
		if (isWriteAllowed(rel)) {
			return true;
		}
		return false;
	}

	function assertReadable(absolutePath: string): void {
		if (!isReadable(absolutePath)) {
			throw new Error(`Read access denied: ${absolutePath}`);
		}
	}

	function assertWritable(absolutePath: string): void {
		if (!isWritable(absolutePath)) {
			throw new Error(`Write access denied: ${absolutePath}`);
		}
	}

	function filterReadable(dir: string, entries: string[]): string[] {
		return entries.filter((entry) => {
			const abs = path.join(dir, entry);
			const rel = abs.slice(1);
			return isReadable(rel);
		});
	}

	return {
		async resolve(...paths) {
			const absPath = await inner.resolve(...paths);
			assertReadable(absPath);
			return absPath;
		},
		async readFile(p) {
			assertReadable(p);
			return inner.readFile(p);
		},

		async writeFile(p, content) {
			assertWritable(p);
			return inner.writeFile(p, content);
		},

		async mkdir(p, options) {
			assertWritable(p);
			return inner.mkdir(p, options);
		},

		async access(p) {
			assertReadable(p);
			return inner.access(p);
		},

		async stat(p) {
			assertReadable(p);
			return inner.stat(p);
		},

		async readdir(p) {
			const entries = await inner.readdir(p);
			return filterReadable(p, entries);
		},

		async exists(p) {
			assertReadable(p);
			return inner.exists(p);
		},

		async glob(pattern, options) {
			const results = await inner.glob(pattern, options);
			// Glob results are relative to options.root_dir — make absolute to check
			return results.filter((entry) => {
				const abs = path.resolve(options.root_dir ?? '.', entry);
				const rel = abs.slice(1);
				return isReadable(rel);
			});
		},

		async deleteFile(p) {
			assertWritable(p);
			return inner.deleteFile(p);
		},
	};
}
