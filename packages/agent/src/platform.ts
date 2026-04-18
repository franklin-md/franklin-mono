import type { AbsolutePath, Filesystem, Terminal } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';
import type { EnvironmentFactory } from '@franklin/extensions';
import type { OAuthFlow } from './auth/oauth-flow.js';

// TODO: Is this right?
type ProviderMeta = {
	id: string;
	name: string;
};

type Disposable = { dispose(): Promise<void> };

export interface OperatingSystem {
	terminal: Terminal;
	filesystem: Filesystem;
	getHome(): Promise<AbsolutePath>;
	openExternal(url: string): Promise<void>;
}

export interface Platform {
	spawn: () => Promise<ClientProtocol & Disposable>;
	environment: EnvironmentFactory;

	// TODO: Are these the right names?
	ai: {
		getOAuthProviders: () => Promise<ProviderMeta[]>;
		getApiKeyProviders: () => Promise<string[]>;
	};

	createFlow(provider: string): Promise<OAuthFlow>;
	os: OperatingSystem;

	// TODO: Sandbox
}
