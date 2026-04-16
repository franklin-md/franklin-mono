import { createBundle } from '../../../algebra/system/bundle/index.js';
import { fileKey } from '../common/key.js';
import { writeExtension as buildWriteExtension } from './extension.js';
import { writeFileSpec } from './tools.js';

export const writeExtension = createBundle({
	extension: buildWriteExtension(),
	keys: { lastRead: fileKey },
	tools: { writeFile: writeFileSpec },
});
