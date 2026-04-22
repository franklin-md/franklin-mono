import type {
	Fetch,
	Filesystem,
	ListenLoopbackOptions,
	LoopbackListener,
	OsInfo,
	Process,
} from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';
import type { EnvironmentFactory } from '@franklin/extensions';

type Disposable = { dispose(): Promise<void> };

export interface OperatingSystem {
	process: Process;
	filesystem: Filesystem;
	osInfo: OsInfo;
	openExternal(url: string): Promise<void>;
	net: {
		listenLoopback(options?: ListenLoopbackOptions): Promise<LoopbackListener>;
		fetch: Fetch;
	};
}

export interface Platform {
	spawn: () => Promise<ClientProtocol & Disposable>;
	environment: EnvironmentFactory;

	ai: {
		getApiKeyProviders: () => Promise<string[]>;
	};

	os: OperatingSystem;

	// TODO: Sandbox
}
