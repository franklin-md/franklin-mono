import type { Terminal } from '@franklin/lib';
import type { WebAPI } from '@franklin/extensions';

export function createStubTerminal(): Terminal {
	return {
		async exec() {
			throw new Error('Terminal is not available in Obsidian');
		},
	};
}

export function createStubWeb(): WebAPI {
	return {
		async fetch() {
			throw new Error('Web API is not available in Obsidian');
		},
	};
}
