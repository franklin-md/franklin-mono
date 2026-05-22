import { createBundle } from '../../modules/bundle/index.js';
import { spawnExtension as extension } from './extension.js';
import { spawnSpec } from './tools.js';

export const spawnExtension = createBundle({
	extension,
	keys: {},
	tools: { spawn: spawnSpec },
});
