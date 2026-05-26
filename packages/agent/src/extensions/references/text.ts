import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { referenceUnavailable } from './unavailable.js';

type TextDocumentLocator = {
	readonly text: string;
	readonly uri?: string;
};

const textDocumentReferenceHandler: ReferenceHandler = {
	type: 'text.document',
	toContext(reference) {
		if (!isTextDocumentLocator(reference.locator)) {
			return referenceUnavailable(
				'text.document references require a locator with string text',
			);
		}

		return {
			content: [
				{
					type: 'text',
					text: `Reference: ${referenceLabel(reference)}\n\n${reference.locator.text}`,
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

function isTextDocumentLocator(
	locator: unknown,
): locator is TextDocumentLocator {
	return (
		typeof locator === 'object' &&
		locator !== null &&
		'text' in locator &&
		typeof locator.text === 'string' &&
		(!('uri' in locator) || typeof locator.uri === 'string')
	);
}

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	if (isTextDocumentLocator(reference.locator) && reference.locator.uri) {
		return reference.locator.uri;
	}
	return reference.type;
}
