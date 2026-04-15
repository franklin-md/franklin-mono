import type {
	AbsolutePath,
	Filesystem,
	FilesystemPermissions,
	NetworkPermissions,
	Terminal,
	WebFetchResponse,
	WebFetchRequest,
} from '@franklin/lib';

export interface FilesystemConfig {
	cwd: AbsolutePath;
	permissions: FilesystemPermissions;
}

export type NetworkConfig = NetworkPermissions;

export interface WebAPI {
	fetch(request: WebFetchRequest): Promise<WebFetchResponse>;
}

export interface EnvironmentConfig {
	fsConfig: FilesystemConfig;
	netConfig: NetworkConfig;
}

export interface Environment {
	readonly filesystem: Filesystem;
	readonly terminal: Terminal;
	readonly web: WebAPI;
}

export interface ReconfigurableEnvironment extends Environment {
	config(): Promise<EnvironmentConfig>;
	reconfigure(config: Partial<EnvironmentConfig>): Promise<void>;
	dispose(): Promise<void>;
}
