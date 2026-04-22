import ignore from 'ignore';
import { joinAbsolute } from '../paths/index.js';
import type { AbsolutePath } from '../paths/index.js';
import type { Filesystem } from './types.js';

// TODO: The concept of permission system is not core, but rather tied to the extensions/environement system.
// Hence, we should move the permissions type + implementation there (maybe into a folder called sandboxing), along with the network permissions + policy
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
 * Patterns are matched against slash-separated paths relative to the
 * absolute root. To allow everything under a directory, use
 * `project/**`.
 */
export interface FilesystemPermissions {
	/** Gitignore-style patterns for paths that may be read. */
	denyRead: readonly string[];
	allowRead: readonly string[];
	/** Gitignore-style patterns for paths that may be written. */
	allowWrite: readonly string[];
	denyWrite: readonly string[];
}

// Empty lists mean "use the default policy": reads are allowed, writes denied.
export const FILESYSTEM_DEFAULT_PERMISSIONS = {
	allowRead: [],
	denyRead: [],
	allowWrite: [],
	denyWrite: [],
} as const satisfies FilesystemPermissions;

export const FILESYSTEM_ALLOW_ALL = {
	allowRead: ['**'],
	denyRead: [],
	allowWrite: ['**'],
	denyWrite: [],
} as const satisfies FilesystemPermissions;

// Writes already fail closed by default, so deny-all only needs to deny reads.
export const FILESYSTEM_DENY_ALL = {
	allowRead: [],
	denyRead: ['**'],
	allowWrite: [],
	denyWrite: [],
} as const satisfies FilesystemPermissions;

function createMatcher(
	patterns: readonly string[],
): (filePath: string) => boolean {
	const ig = ignore().add([...patterns]);
	return (filePath: string) => ig.ignores(filePath);
}

/**
 * Creates a `Filesystem` that enforces filesystem access control.
 *
 * Reads are default-allow with deny-then-allow precedence. Writes are
 * default-deny with allow-then-deny precedence. `readdir` and `glob`
 * results are filtered to only include readable entries.
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

	function isReadable(absolutePath: AbsolutePath): boolean {
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

	function isWritable(absolutePath: AbsolutePath): boolean {
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

	function assertReadable(absolutePath: AbsolutePath): void {
		if (!isReadable(absolutePath)) {
			throw new Error(`Read access denied: ${absolutePath}`);
		}
	}

	function assertWritable(absolutePath: AbsolutePath): void {
		if (!isWritable(absolutePath)) {
			throw new Error(`Write access denied: ${absolutePath}`);
		}
	}

	function filterReadable(dir: AbsolutePath, entries: string[]): string[] {
		return entries.filter((entry) => {
			const abs = joinAbsolute(dir, entry);
			return isReadable(abs);
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
			// Glob results are relative to options.root_dir or the inner cwd.
			const visible = await Promise.all(
				results.map(async (entry) => {
					const abs = await inner.resolve(options.root_dir ?? '.', entry);
					return isReadable(abs) ? entry : undefined;
				}),
			);
			return visible.filter((entry): entry is string => entry !== undefined);
		},

		async deleteFile(p) {
			assertWritable(p);
			return inner.deleteFile(p);
		},
	};
}
