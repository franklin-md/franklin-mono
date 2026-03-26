import type { Filesystem } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';
import type { Environment } from '@franklin/extensions';

// TODO: Is this right?
type ProviderMeta = {
	id: string;
	name: string;
};
export interface Platform {
	spawn: () => Promise<ClientProtocol>;
	environment: () => Promise<Environment>;

	// TODO: Are these the right names?
	ai: {
		getOAuthProviders: () => Promise<ProviderMeta[]>;
		getApiKeyProviders: () => Promise<string[]>;
	};

	filesystem: Filesystem;

	// TODO: Sandbox
}
