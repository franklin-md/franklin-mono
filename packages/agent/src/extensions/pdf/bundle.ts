import { createBundle } from '../../modules/bundle/index.js';
import type { ExtensionBundle } from '../../modules/bundle/index.js';
import { readPDFExtension } from './extension.js';
import { readPDFSpec } from './tools.js';
import type { ReadPDFExtensionOptions } from './types.js';

type ReadPDFBundle = ExtensionBundle<
	Record<string, never>,
	{ readPDF: typeof readPDFSpec }
>;

export function createReadPDFExtension(
	options: ReadPDFExtensionOptions,
): ReadPDFBundle {
	return createBundle({
		extension: readPDFExtension(options),
		keys: {},
		tools: {
			readPDF: readPDFSpec,
		},
	});
}
