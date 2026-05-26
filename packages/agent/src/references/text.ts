import type { Reference, ReferenceHandler } from './api/index.js';

type TextDocumentLocator = {
	readonly text: string;
	readonly uri?: string;
};

export const textDocumentReferenceHandler: ReferenceHandler = {
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

function referenceUnavailable(message: string) {
	return {
		content: [
			{ type: 'text' as const, text: `Reference unavailable: ${message}` },
		],
	};
}
