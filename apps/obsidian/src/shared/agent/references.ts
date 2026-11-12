import {
	filesystemFileReferenceExtension,
	createHTTPReferenceExtension,
	imageDocumentReferenceExtension,
	textDocumentReferenceExtension,
} from '@franklin/agent';
import { createPDFDocumentReferenceExtension } from '@franklin/extension-pdf';
import { renderObsidianPDFScreenshots } from './pdf/screenshots.js';

export function createObsidianReferenceExtensions() {
	return [
		filesystemFileReferenceExtension,
		createHTTPReferenceExtension(),
		createPDFDocumentReferenceExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}),
		imageDocumentReferenceExtension,
		textDocumentReferenceExtension,
	];
}
