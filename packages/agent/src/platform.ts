import type { Filesystem } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';

export interface Platform {
	spawn: () => Promise<ClientProtocol>;

	filesystem: Filesystem;

	// TODO: Sandbox
}
