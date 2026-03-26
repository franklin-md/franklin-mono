import * as path from 'node:path';
import type { Filesystem } from './types.js';

/**
 * Creates a `Filesystem` where relative paths resolve against `cwd`.
 *
 * This is purely about path resolution — no access control.
 * Compose with `createFilteredFilesystem` for security policies.
 */
export function createFolderScopedFilesystem(
	cwd: string,
	inner: Filesystem,
): Filesystem {
	if (!path.isAbsolute(cwd)) {
		throw new Error(`cwd must be an absolute path, got: ${cwd}`);
	}

	function resolve(p: string): string {
		return path.resolve(cwd, p);
	}

	return {
		async readFile(p) {
			return inner.readFile(resolve(p));
		},

		async writeFile(p, content) {
			return inner.writeFile(resolve(p), content);
		},

		async mkdir(p, options) {
			return inner.mkdir(resolve(p), options);
		},

		async access(p) {
			return inner.access(resolve(p));
		},

		async stat(p) {
			return inner.stat(resolve(p));
		},

		async readdir(p) {
			return inner.readdir(resolve(p));
		},

		async exists(p) {
			return inner.exists(resolve(p));
		},

		async glob(pattern, options) {
			return inner.glob(pattern, {
				...options,
				cwd: options.cwd ? resolve(options.cwd) : cwd,
			});
		},

		async deleteFile(p) {
			return inner.deleteFile(resolve(p));
		},
	};
}
