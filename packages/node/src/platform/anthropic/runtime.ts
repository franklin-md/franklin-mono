import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import { SandboxScheduler } from './scheduler/index.js';
import { requiresSwitch } from './requires-switch.js';

function infrastructureConfig(config: SandboxRuntimeConfig) {
	return {
		...config,
		network: { ...config.network, allowedDomains: [], deniedDomains: [] },
	};
}

// One scheduler owns the one loaded SRT manager. Constructing a scheduler per
// agent would create independent queues racing over the same shared proxies.
export const sandboxScheduler = new SandboxScheduler({
	reset: () => SandboxManager.reset(),
	async switchConfig(previous, next) {
		if (
			!requiresSwitch(
				previous && infrastructureConfig(previous),
				infrastructureConfig(next),
			)
		) {
			// Native lists are read live; captured proxy settings require restart.
			// PR #301's callback adapter will also need its active policy switched here.
			// See ./README.md#what-can-vary-per-command.
			SandboxManager.updateConfig(next);
			return;
		}
		if (previous) await SandboxManager.reset();
		await SandboxManager.initialize(next);
	},
});
