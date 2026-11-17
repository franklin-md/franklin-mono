import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import type { NetworkPermissions } from '@franklin/lib';
import { SandboxScheduler } from './scheduler/index.js';
import { requiresSwitch } from './requires-switch.js';
import { nativeConfig } from './native-config.js';
import { createSandboxNetworkPolicy } from './network.js';

const denyAll: NetworkPermissions = { allowedDomains: [], deniedDomains: [] };
let activePolicy = denyAll;
const ask = createSandboxNetworkPolicy(() => activePolicy);

async function reset() {
	activePolicy = denyAll;
	await SandboxManager.reset();
}

// One scheduler owns the one loaded SRT manager. Constructing a scheduler per
// agent would create independent queues racing over the same shared proxies.
export const sandboxScheduler = new SandboxScheduler({
	reset,
	async switchConfig(previous, next) {
		const native = nativeConfig(next);
		if (!requiresSwitch(previous && nativeConfig(previous), native)) {
			// The scheduler has drained active commands. SRT retains the callback;
			// changing its policy here keeps the proxies warm without leaking access
			// between commands. See ./README.md#what-can-vary-per-command.
			activePolicy = next.network;
			return;
		}
		if (previous) await reset();
		activePolicy = next.network;
		await SandboxManager.initialize(native, ask);
	},
});
