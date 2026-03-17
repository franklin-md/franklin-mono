import type { NodeFramework } from '@franklin/node';
import type { ProvisionOptions } from '@franklin/node';
import { ipcMain } from 'electron';

import { ENV_PROVISION, ENV_DISPOSE } from '../../shared/channels.js';

/**
 * Bridges renderer <-> main for environment lifecycle over Electron IPC.
 *
 * Delegates provisioning and disposal to NodeFramework.
 */
export class FrameworkRelay {
	constructor(private readonly framework: NodeFramework) {
		ipcMain.handle(ENV_PROVISION, (_event, opts?: ProvisionOptions) => {
			const env = this.framework.provision(opts);
			return env.id;
		});
		ipcMain.handle(ENV_DISPOSE, (_event, envId: string) =>
			this.framework.disposeEnv(envId),
		);
	}

	async dispose(): Promise<void> {
		ipcMain.removeHandler(ENV_PROVISION);
		ipcMain.removeHandler(ENV_DISPOSE);
	}
}
