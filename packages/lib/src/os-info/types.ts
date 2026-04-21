import type { AbsolutePath } from '../paths/index.js';

export type PlatformName = 'mac' | 'linux' | 'windows';

export type ShellFamily = 'posix' | 'powershell' | 'cmd' | 'fish';

export interface ShellInfo {
	path: string;
	family: ShellFamily;
}

export interface OsInfo {
	getPlatform(): Promise<PlatformName>;
	getOsVersion(): Promise<string>;
	getShellInfo(): Promise<ShellInfo>;
	getHomeDir(): Promise<AbsolutePath>;
}
