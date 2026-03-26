import type { Filesystem } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';
import type { Environment } from '@franklin/extensions';

export interface Platform {
	spawn: () => Promise<ClientProtocol>;
	environment: () => Promise<Environment>;

	filesystem: Filesystem;

	// TODO: Sandbox
}
