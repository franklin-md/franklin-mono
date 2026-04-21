import { createBundle } from '../../algebra/system/bundle/create.js';
import { createEnvironmentInfoExtension } from './extension.js';

export const environmentInfoExtension = createBundle({
	extension: createEnvironmentInfoExtension(),
	keys: {},
	tools: {},
});
