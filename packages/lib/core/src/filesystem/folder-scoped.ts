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
	return {
		resolve(...paths: string[]) {
			return inner.resolve(cwd, ...paths);
		},
		async readFile(p) {
			return inner.readFile(await inner.resolve(cwd, p));
		},

		async writeFile(p, content) {
			return inner.writeFile(await inner.resolve(cwd, p), content);
		},

		async mkdir(p, options) {
			return inner.mkdir(await inner.resolve(cwd, p), options);
		},

		async access(p) {
			return inner.access(await inner.resolve(cwd, p));
		},

		async stat(p) {
			return inner.stat(await inner.resolve(cwd, p));
		},

		async readdir(p) {
			return inner.readdir(await inner.resolve(cwd, p));
		},

		async exists(p) {
			return inner.exists(await inner.resolve(cwd, p));
		},

		async glob(pattern, options) {
			return inner.glob(pattern, {
				...options,
				root_dir: options.root_dir
					? await inner.resolve(cwd, options.root_dir)
					: cwd,
			});
		},

		async deleteFile(p) {
			return inner.deleteFile(await inner.resolve(cwd, p));
		},
	};
}
