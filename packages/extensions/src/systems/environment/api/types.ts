import type {
	AbsolutePath,
	Filesystem,
	FilesystemPermissions,
	NetworkPermissions,
	OsInfo,
	Terminal,
	WebAPI,
} from '@franklin/lib';

export interface FilesystemConfig {
	cwd: AbsolutePath;
	permissions: FilesystemPermissions;
}

export interface EnvironmentConfig {
	fsConfig: FilesystemConfig;
	// AGENT-TODO: Would like type to be renamed to NetworkConfig
	netConfig: NetworkPermissions;
}

export interface Environment {
	readonly filesystem: Filesystem;
	readonly terminal: Terminal;
	readonly web: WebAPI;
	readonly osInfo: OsInfo;
}

export interface ReconfigurableEnvironment extends Environment {
	config(): Promise<EnvironmentConfig>;
	reconfigure(config: Partial<EnvironmentConfig>): Promise<void>;
	dispose(): Promise<void>;
}
