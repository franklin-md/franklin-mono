import type { AbsolutePath, PlatformName, ShellInfo } from '@franklin/lib';

export interface EnvironmentInfoFields {
	cwd: AbsolutePath;
	platform: PlatformName;
	shell: ShellInfo;
	osVersion: string;
	homeDir: AbsolutePath;
}

export function renderEnvironmentInfo(fields: EnvironmentInfoFields): string {
	return [
		`Working directory: ${fields.cwd}`,
		`Platform: ${fields.platform}`,
		`Shell: ${fields.shell.path} (${fields.shell.family})`,
		`OS Version: ${fields.osVersion}`,
		`Home directory: ${fields.homeDir}`,
	].join('\n');
}
