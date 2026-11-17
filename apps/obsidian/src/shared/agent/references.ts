import {
	filesystemFileReferenceExtension,
	imageDocumentReferenceExtension,
	textDocumentReferenceExtension,
} from '@franklin/agent';
import { createPDFDocumentReferenceExtension } from '@franklin/extension-pdf';
import { renderObsidianPDFScreenshots } from './pdf/screenshots.js';

export function createObsidianReferenceExtensions() {
	return [
		filesystemFileReferenceExtension,
		createPDFDocumentReferenceExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}),
		imageDocumentReferenceExtension,
		textDocumentReferenceExtension,
	];
}
