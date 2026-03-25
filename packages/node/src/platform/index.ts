import type { Platform } from '@franklin/agent';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';

export function createNodePlatform(): Platform {
	return {
		spawn: async () => spawn(),
		filesystem: createNodeFilesystem(),
		// TODO: Sandbox
	};
}
