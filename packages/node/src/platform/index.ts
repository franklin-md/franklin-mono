import type { Platform } from '@franklin/agent/browser';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';

export function createNodePlatform(): Platform {
	const filesystem = createNodeFilesystem();
	let environment: Awaited<ReturnType<Platform['environment']>> | null = null;

	return {
		spawn: async () => spawn(),
		environment: async () => {
			environment ??= { filesystem };
			return environment;
		},
		filesystem,
		// TODO: Sandbox
	};
}
