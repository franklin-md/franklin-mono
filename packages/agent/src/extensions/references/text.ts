import { decode } from '@franklin/lib';
import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
	ResolvedReference,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

const textDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			reference.type === 'text.document' ||
			(reference.data?.type === 'bytes' && isTextData(reference))
		);
	},
	toContext(reference) {
		const text =
			reference.data?.type === 'bytes'
				? decode(reference.data.bytes)
				: reference.locator;
		return {
			content: [
				{
					type: 'text',
					text: `Reference: ${referenceLabel(reference)}\n\n${text}`,
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

function isTextData(reference: ResolvedReference): boolean {
	const mime = reference.data?.mime;
	return mime === undefined || mime.startsWith('text/');
}
