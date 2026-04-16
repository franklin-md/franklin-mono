import { createBundle } from '../../algebra/bundle/index.js';
import { spawnExtension as buildSpawnExtension } from './extension.js';
import { spawnSpec } from './tools.js';

export const spawnExtension = createBundle({
	extension: buildSpawnExtension(),
	keys: {},
	tools: { spawn: spawnSpec },
});
