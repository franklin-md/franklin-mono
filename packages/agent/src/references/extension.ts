import { defineExtension, type EnvironmentModule } from '@franklin/extensions';
import type { ReferencesModule } from './module.js';
import { filesystemFileReferenceHandler } from './filesystem.js';
import { pdfDocumentReferenceHandler } from './pdf.js';
import { textDocumentReferenceHandler } from './text.js';

export function referencesExtension() {
	return defineExtension<[ReferencesModule, EnvironmentModule]>((api) => {
		api.registerReferenceHandler(textDocumentReferenceHandler);
		api.registerReferenceHandler(pdfDocumentReferenceHandler);
		api.registerReferenceHandler(filesystemFileReferenceHandler);
	});
}
