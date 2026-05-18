import { createBundle } from '../../modules/bundle/index.js';
import { readPDFExtension } from './extension.js';
import { readPDFSpec } from './tools.js';
import type { PDFConverter } from './types.js';

export function createReadPDFExtension(pdfConverter: PDFConverter) {
	return createBundle({
		extension: readPDFExtension(pdfConverter),
		keys: {},
		tools: {
			readPDF: readPDFSpec,
		},
	});
}
