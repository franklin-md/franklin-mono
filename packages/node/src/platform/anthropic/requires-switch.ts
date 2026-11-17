import { isDeepStrictEqual } from 'node:util';
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';

function sharedConfig(config: SandboxRuntimeConfig) {
	// Only these four lists are overridden per command in SRT 0.0.46.
	// Keep allowGitConfig and unknown future fields in the shared comparison.
	// See ./README.md#what-can-vary-per-command for the upstream source.
	return {
		...config,
		filesystem: {
			...config.filesystem,
			allowRead: [],
			denyRead: [],
			allowWrite: [],
			denyWrite: [],
		},
	};
}

export function requiresSwitch(
	previous: SandboxRuntimeConfig | undefined,
	next: SandboxRuntimeConfig | undefined,
): boolean {
	return (
		next !== undefined &&
		(previous === undefined ||
			!isDeepStrictEqual(sharedConfig(previous), sharedConfig(next)))
	);
}
