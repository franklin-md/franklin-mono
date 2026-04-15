import type { Terminal } from '@franklin/lib';

export function createStubTerminal(): Terminal {
	return {
		async exec() {
			throw new Error('Terminal is not available in Obsidian');
		},
	};
}
