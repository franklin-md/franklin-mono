import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import type { NetworkPermissions } from '@franklin/lib';
import { SandboxScheduler } from './scheduler/index.js';
import { requiresSwitch } from './requires-switch.js';
import { nativeConfig } from './native-config.js';
import { createSandboxNetworkPolicy } from './network.js';

function createScheduler(): SandboxScheduler {
	const denyAll: NetworkPermissions = { allowedDomains: [], deniedDomains: [] };
	let activePolicy = denyAll;
	const networkPolicy = createSandboxNetworkPolicy(() => activePolicy);

	async function reset() {
		activePolicy = denyAll;
		await SandboxManager.reset();
	}

	return new SandboxScheduler({
		reset,
		async switchConfig(previous, next) {
			const nextNativeConfig = nativeConfig(next);
			const restart = requiresSwitch(
				previous && nativeConfig(previous),
				nextNativeConfig,
			);
			if (restart && previous) await reset();

			// The scheduler has drained active commands. Policy-only changes can
			// reuse SRT's retained callback and keep its proxies running.
			activePolicy = next.network;
			if (restart)
				await SandboxManager.initialize(nextNativeConfig, networkPolicy);
		},
	});
}

// SRT's SandboxManager is shared by every importer of that module. All Franklin
// process wrappers must therefore share this scheduler and its private policy.
// Creating a scheduler per agent would let independent queues race over SRT.
export const sharedSandboxScheduler = createScheduler();
