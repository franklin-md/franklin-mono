import { createBundle } from '../../bundle/create.js';
import { statusExtension as buildStatusExtension } from './extension.js';
import { statusKey } from './key.js';

export const statusExtension = createBundle({
	extension: buildStatusExtension(),
	keys: { status: statusKey },
	tools: {},
});
