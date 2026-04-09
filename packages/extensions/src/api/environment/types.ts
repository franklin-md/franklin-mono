import type {
	Filesystem,
	FilesystemPermissions,
	NetworkPermissions,
	Terminal,
	WebFetchResponse,
	WebFetchRequest,
} from '@franklin/lib';

export interface FilesystemConfig {
	cwd: string;
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
	config(): Promise<EnvironmentConfig>;
	reconfigure(config: Partial<EnvironmentConfig>): Promise<void>;
}
