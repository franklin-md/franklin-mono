import os from 'node:os';
import {
	detectShellFamily,
	toAbsolutePath,
	type AbsolutePath,
	type OsInfo,
	type PlatformName,
	type ShellInfo,
} from '@franklin/lib';

export function createNodeOsInfo(): OsInfo {
	return {
		getPlatform: async () => mapPlatform(os.platform()),
		getOsVersion: async () => `${os.type()} ${os.release()}`,
		getShellInfo: async (): Promise<ShellInfo> => {
			const shell = process.env.SHELL ?? defaultShell();
			return { path: shell, family: detectShellFamily(shell) };
		},
		getHomeDir: async (): Promise<AbsolutePath> => toAbsolutePath(os.homedir()),
	};
}

function mapPlatform(platform: NodeJS.Platform): PlatformName {
	if (platform === 'darwin') return 'mac';
	if (platform === 'win32') return 'windows';
	return 'linux';
}

function defaultShell(): string {
	return os.platform() === 'win32' ? 'cmd.exe' : '/bin/sh';
}
