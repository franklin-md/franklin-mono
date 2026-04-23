import { toAbsolutePath, type AbsolutePath } from '../paths/index.js';
import type { PlatformName, OsInfo, ShellInfo } from './types.js';

export interface MemoryOsInfoValues {
	platform?: PlatformName;
	osVersion?: string;
	shell?: ShellInfo;
	homeDir?: AbsolutePath;
}

/**
 * In-memory `OsInfo` implementation for tests. All fields have sensible
 * defaults so callers can override only what they care about.
 */
export class MemoryOsInfo implements OsInfo {
	private platform: PlatformName;
	private osVersion: string;
	private shell: ShellInfo;
	private homeDir: AbsolutePath;

	constructor(values: MemoryOsInfoValues = {}) {
		this.platform = values.platform ?? 'mac';
		this.osVersion = values.osVersion ?? 'Darwin 24.0.0';
		this.shell = values.shell ?? { path: '/bin/zsh', family: 'posix' };
		this.homeDir = values.homeDir ?? toAbsolutePath('/home/test');
	}

	getPlatform(): Promise<PlatformName> {
		return Promise.resolve(this.platform);
	}

	getOsVersion(): Promise<string> {
		return Promise.resolve(this.osVersion);
	}

	getShellInfo(): Promise<ShellInfo> {
		return Promise.resolve(this.shell);
	}

	getHomeDir(): Promise<AbsolutePath> {
		return Promise.resolve(this.homeDir);
	}
}
