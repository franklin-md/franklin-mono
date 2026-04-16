import { createBundle } from '../../algebra/system/bundle/index.js';
import { bashExtension as buildBashExtension } from './extension.js';
import { bashSpec } from './tools.js';

export const bashExtension = createBundle({
	extension: buildBashExtension(),
	keys: {},
	tools: { bash: bashSpec },
});
