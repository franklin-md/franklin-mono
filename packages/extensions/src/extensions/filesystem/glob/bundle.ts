import { createBundle } from '../../../algebra/system/bundle/index.js';
import { globExtension as buildGlobExtension } from './extension.js';
import { globSpec } from './tools.js';

export const globExtension = createBundle({
	extension: buildGlobExtension(),
	keys: {},
	tools: { glob: globSpec },
});
