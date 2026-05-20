import type {
	Fetch,
	Filesystem,
	ListenLoopbackOptions,
	LoopbackListener,
	OsInfo,
	Process,
} from '@franklin/lib';
import type { MiniACPRpcProtocol } from '@franklin/mini-acp/rpc';
import type { EnvironmentFactory } from './modules/environment/module.js';

export interface Net {
	listenLoopback(options?: ListenLoopbackOptions): Promise<LoopbackListener>;
	fetch: Fetch;
}

export interface OperatingSystem {
	process: Process;
	filesystem: Filesystem;
	osInfo: OsInfo;
	openExternal(url: string): Promise<void>;
	net: Net;
}

export interface Platform {
	spawn: () => Promise<MiniACPRpcProtocol>;
	environment: EnvironmentFactory;

	ai: {
		getApiKeyProviders: () => Promise<string[]>;
	};

	os: OperatingSystem;

	// TODO: Sandbox
}
