import { z } from 'zod';
import type { Extension, ExtensionAPI } from '../../types/extension.js';

export class SpawnExtension implements Extension {
	readonly name = 'spawn';

	constructor(private readonly spawn: () => Promise<void>) {}

	async setup(api: ExtensionAPI): Promise<void> {
		api.registerTool({
			name: 'spawn',
			description: 'Spawn an agent',
			schema: z.object({}),
			execute: async () => {
				return this.spawn();
			},
		});
	}
}
