import type { Filesystem, FilesystemPermissions } from '@franklin/lib';
import {
	createFolderScopedFilesystem,
	createFilteredFilesystem,
} from '@franklin/lib';
import type { FilesystemConfig } from '@franklin/extensions';

/**
 * A mutable Filesystem that composes cwd scoping and permissions filtering.
 *
 * Delegates all Filesystem methods through a decorator chain:
 *   raw fs → folder-scoped(cwd) → filtered(permissions)
 *
 * setCwd/setPermissions rebuild the chain so that subsequent calls
 * go through the updated decorators. The config getter always
 * returns the current state.
 */
export class EnvironmentFilesystem implements Filesystem {
	private _config: FilesystemConfig;
	private inner: Filesystem;
	private current: Filesystem;

	constructor(inner: Filesystem, config: FilesystemConfig) {
		this.inner = inner;
		this._config = { ...config, permissions: { ...config.permissions } };
		this.current = buildChain(inner, this._config);
	}

	get config(): FilesystemConfig {
		return this._config;
	}

	setCwd(cwd: string): void {
		this._config.cwd = cwd;
		this.current = buildChain(this.inner, this._config);
	}

	setPermissions(permissions: FilesystemPermissions): void {
		this._config.permissions = { ...permissions };
		this.current = buildChain(this.inner, this._config);
	}

	resolve(...paths: string[]): Promise<string> {
		return this.current.resolve(...paths);
	}
	readFile(path: string): Promise<Uint8Array> {
		return this.current.readFile(path);
	}

	writeFile(path: string, data: string | Uint8Array): Promise<void> {
		return this.current.writeFile(path, data);
	}

	mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		return this.current.mkdir(path, options);
	}

	access(path: string): Promise<void> {
		return this.current.access(path);
	}

	stat(path: string): Promise<{ isFile: boolean; isDirectory: boolean }> {
		return this.current.stat(path);
	}

	readdir(path: string): Promise<string[]> {
		return this.current.readdir(path);
	}

	exists(path: string): Promise<boolean> {
		return this.current.exists(path);
	}

	glob(
		pattern: string,
		options: { cwd?: string; ignore?: string[]; limit?: number },
	): Promise<string[]> {
		return this.current.glob(pattern, options);
	}

	deleteFile(path: string): Promise<void> {
		return this.current.deleteFile(path);
	}
}

function buildChain(inner: Filesystem, config: FilesystemConfig): Filesystem {
	const filtered = createFilteredFilesystem(config.permissions, inner);
	return createFolderScopedFilesystem(config.cwd, filtered);
}
