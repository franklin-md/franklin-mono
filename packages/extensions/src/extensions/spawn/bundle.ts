import { createBundle } from '../../bundle/create.js';
import { spawnExtension as buildSpawnExtension } from './extension.js';
import { spawnSpec } from './tools.js';

export function createSpawnExtension(spawn: () => Promise<void>) {
	return createBundle({
		extension: buildSpawnExtension(spawn),
		keys: {},
		tools: { spawn: spawnSpec },
	});
}
