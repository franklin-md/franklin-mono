import { createBundle } from '../../modules/bundle/create.js';
import { createInstructionExtension } from './extension.js';

export const instructionsExtension = createBundle({
	extension: createInstructionExtension(),
	keys: {},
	tools: {},
});
