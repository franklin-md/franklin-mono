import {
	filesystemFileReferenceExtension,
	createHTTPReferenceExtension,
	imageDocumentReferenceExtension,
	textDocumentReferenceExtension,
	type HTTPReferenceCache,
} from '@franklin/agent';
import { createPDFDocumentReferenceExtension } from '@franklin/extension-pdf';
import { renderObsidianPDFScreenshots } from './pdf/screenshots.js';

export function createObsidianReferenceExtensions(cache?: HTTPReferenceCache) {
	return [
		filesystemFileReferenceExtension,
		createHTTPReferenceExtension({ cache }),
		createPDFDocumentReferenceExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}),
		imageDocumentReferenceExtension,
		textDocumentReferenceExtension,
	];
}
