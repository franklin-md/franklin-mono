import { createBundle } from '../../modules/bundle/index.js';
import { reduceExtensions } from '@franklin/extensibility';
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

const filesystemToolExtensions = {
	editFile: editExtension(),
	readFile: readExtension(),
	writeFile: writeExtension(),
	glob: globExtension(),
	grep: grepExtension(),
} as const;

export const filesystemBundle = {
	...createBundle({
		extension: reduceExtensions(
			filesystemToolExtensions.editFile,
			filesystemToolExtensions.readFile,
			filesystemToolExtensions.writeFile,
			filesystemToolExtensions.glob,
			filesystemToolExtensions.grep,
		),
		keys: { file: fileKey },
		tools: {
			editFile: editFileSpec,
			readFile: readFileSpec,
			writeFile: writeFileSpec,
			glob: globSpec,
			grep: grepSpec,
		},
	}),
	extensions: filesystemToolExtensions,
};
export const filesystemExtension = filesystemBundle.extension;
