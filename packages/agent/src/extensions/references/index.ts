export {
	FILESYSTEM_FILE_REFERENCE_TYPE,
	filesystemFileReferenceExtension,
} from './filesystem.js';
export { referenceHandlerExtension } from './handler.js';
export {
	IMAGE_REFERENCE_TYPE,
	imageDocumentReferenceExtension,
} from './image.js';
export {
	PDF_REFERENCE_TYPE,
	createPDFDocumentReferenceExtension,
} from './pdf.js';
export { referenceReadExtension, referenceReadFileSpec } from './read.js';
export {
	TEXT_REFERENCE_TYPE,
	parseTextReferenceSelector,
	textDocumentReferenceExtension,
} from './text.js';
export type { TextLineRange, TextReferenceSelector } from './text.js';
