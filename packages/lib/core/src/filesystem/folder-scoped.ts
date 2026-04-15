import type { AbsolutePath, Filesystem } from './types.js';

/**
 * Creates a `Filesystem` where relative paths resolve against `cwd`.
 *
 * Only `resolve` and `glob` need wrapping — all other methods already
 * receive `AbsolutePath` arguments and delegate directly.
 *
 * Compose with `createFilteredFilesystem` for security policies.
 */
export function createFolderScopedFilesystem(
	cwd: AbsolutePath,
	inner: Filesystem,
): Filesystem {
	return {
		resolve: (...paths) => inner.resolve(cwd, ...paths),
		readFile: (p) => inner.readFile(p),
		writeFile: (p, content) => inner.writeFile(p, content),
		mkdir: (p, options) => inner.mkdir(p, options),
		access: (p) => inner.access(p),
		stat: (p) => inner.stat(p),
		readdir: (p) => inner.readdir(p),
		exists: (p) => inner.exists(p),
		glob: (pattern, options) =>
			inner.glob(pattern, {
				...options,
				root_dir: options.root_dir ?? cwd,
			}),
		deleteFile: (p) => inner.deleteFile(p),
	};
}
