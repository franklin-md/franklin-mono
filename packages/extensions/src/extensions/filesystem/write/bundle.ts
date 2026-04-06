import { createBundle } from '../../../bundle/create.js';
import { writeExtension as buildWriteExtension } from './extension.js';
import { writeFileSpec } from './tools.js';

export const writeExtension = createBundle({
	extension: buildWriteExtension(),
	keys: {},
	tools: { writeFile: writeFileSpec },
});
