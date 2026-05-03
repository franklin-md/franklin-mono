import { createBundle } from '../../modules/bundle/index.js';
import { reduceExtensions } from '../../algebra/extension/index.js';
import { fileKey } from './common/key.js';
import { editExtension } from './edit/extension.js';
import { editFileSpec } from './edit/tools.js';
import { globExtension } from './glob/extension.js';
import { globSpec } from './glob/tools.js';
import { grepExtension } from './grep/extension.js';
import { grepSpec } from './grep/tools.js';
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
		grepExtension(),
	),
	keys: { file: fileKey },
	tools: {
		editFile: editFileSpec,
		readFile: readFileSpec,
		writeFile: writeFileSpec,
		glob: globSpec,
		grep: grepSpec,
	},
});
