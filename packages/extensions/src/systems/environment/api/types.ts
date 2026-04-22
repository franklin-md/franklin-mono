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
	// TODO(FRA-239): Rename this to NetworkConfig.
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
