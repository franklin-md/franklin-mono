import type {
	Filesystem,
	FilesystemPermissions,
	NetworkPermissions,
	Terminal,
} from '@franklin/lib';

export interface FilesystemConfig {
	cwd: string;
	permissions: FilesystemPermissions;
}

export type NetworkConfig = NetworkPermissions;

export interface EnvironmentConfig {
	fsConfig: FilesystemConfig;
	netConfig: NetworkConfig;
}

export interface Environment {
	readonly filesystem: Filesystem;
	readonly terminal: Terminal;
	config(): Promise<EnvironmentConfig>;
	reconfigure(config: Partial<EnvironmentConfig>): Promise<void>;
}
