import type { Filesystem } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';
import type { Environment } from '@franklin/extensions';
import type { OAuthProviderInterface } from 'node_modules/@mariozechner/pi-ai/dist/utils/oauth/types.js';

// TODO: Is this right?
type ProviderMeta = {
	id: string;
	name: string;
};

type Disposable = { dispose(): Promise<void> };

export interface Platform {
	spawn: () => Promise<ClientProtocol & Disposable>;
	environment: () => Promise<Environment & Disposable>;

	// TODO: Are these the right names?
	ai: {
		getOAuthProviders: () => Promise<ProviderMeta[]>;
		getApiKeyProviders: () => Promise<string[]>;
		// TODO: do we need more?
		getProvider: (
			id: string,
		) => Promise<Pick<OAuthProviderInterface, 'login'> & Disposable>;
	};

	filesystem: Filesystem;

	// TODO: Sandbox
}
