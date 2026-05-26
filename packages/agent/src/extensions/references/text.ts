import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

const textDocumentReferenceHandler: ReferenceHandler = {
	type: 'text.document',
	toContext(reference) {
		return {
			content: [
				{
					type: 'text',
					text: `Reference: ${referenceLabel(reference)}\n\n${reference.locator}`,
				},
			],
		};
	},
};

export const textDocumentReferenceExtension = defineExtension<
	[ReferencesModule]
>((api) => {
	api.registerReferenceHandler(textDocumentReferenceHandler);
});

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	return reference.type;
}
