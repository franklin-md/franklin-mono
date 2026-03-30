import type { Filesystem, FilesystemPermissions } from '@franklin/lib';

export interface EnvironmentConfig {
	cwd: string;
	permissions: FilesystemPermissions;
}

export interface Environment {
	readonly filesystem: Filesystem;
	config(): Promise<EnvironmentConfig>;
	reconfigure(config: Partial<EnvironmentConfig>): Promise<void>;
}
