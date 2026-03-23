import type { NodeFramework } from '@franklin/node';

/**
 * Bridges renderer <-> main for framework operations over Electron IPC.
 *
 * With the in-process spawn model, environment provisioning is no longer
 * needed — agents are spawned directly via NodeFramework.spawn().
 */
export class FrameworkRelay {
	constructor(readonly framework: NodeFramework) {}

	async dispose(): Promise<void> {
		// Nothing to clean up — agent lifecycle is managed by AgentRelay
	}
}
