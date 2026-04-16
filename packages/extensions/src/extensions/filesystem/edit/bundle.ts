import { createBundle } from '../../../algebra/bundle/create.js';
import { editExtension as buildEditExtension } from './extension.js';
import { fileKey } from '../common/key.js';
import { editFileSpec } from './tools.js';

export const editExtension = createBundle({
	extension: buildEditExtension(),
	keys: { lastRead: fileKey },
	tools: { editFile: editFileSpec },
});
