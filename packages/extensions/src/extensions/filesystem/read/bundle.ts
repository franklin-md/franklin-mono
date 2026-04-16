import { createBundle } from '../../../algebra/bundle/create.js';
import { readExtension as buildReadExtension } from './extension.js';
import { readFileSpec } from './tools.js';

export const readExtension = createBundle({
	extension: buildReadExtension(),
	keys: {},
	tools: { readFile: readFileSpec },
});
