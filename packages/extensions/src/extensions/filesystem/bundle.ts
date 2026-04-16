import { createBundle } from '../../algebra/system/bundle/index.js';
import { reduceExtensions } from '../../algebra/types/index.js';
import { fileKey } from './common/key.js';
import { editExtension } from './edit/extension.js';
import { editFileSpec } from './edit/tools.js';
import { globExtension } from './glob/extension.js';
import { globSpec } from './glob/tools.js';
import { readExtension } from './read/extension.js';
import { readFileSpec } from './read/tools.js';
import { writeExtension } from './write/extension.js';
import { writeFileSpec } from './write/tools.js';

export const filesystemExtension = createBundle({
	extension: reduceExtensions(
		editExtension(),
		readExtension(),
		writeExtension(),
		globExtension(),
	),
	keys: { file: fileKey },
	tools: {
		editFile: editFileSpec,
		readFile: readFileSpec,
		writeFile: writeFileSpec,
		glob: globSpec,
	},
});
