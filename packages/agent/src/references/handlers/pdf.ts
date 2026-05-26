import type { Reference, ReferenceHandler } from '../api/index.js';
import { referenceUnavailable } from './unavailable.js';

type PdfDocumentLocator = {
	readonly path?: string;
	readonly uri?: string;
};

type PageSelector = {
	readonly page: number;
};

export const pdfDocumentReferenceHandler: ReferenceHandler = {
	type: 'pdf.document',
	toContext(reference) {
		if (!isPdfDocumentLocator(reference.locator)) {
			return referenceUnavailable(
				'pdf.document references require a locator with path or uri',
			);
		}

		const label = referenceLabel(reference);
		const page = pageSuffix(reference.selector);
		return {
			content: [
				{
					type: 'text',
					text: `PDF reference unavailable: ${label}${page}. PDF extraction is not implemented in v1.`,
				},
			],
		};
	},
};

function isPdfDocumentLocator(locator: unknown): locator is PdfDocumentLocator {
	return (
		typeof locator === 'object' &&
		locator !== null &&
		(('path' in locator && typeof locator.path === 'string') ||
			('uri' in locator && typeof locator.uri === 'string'))
	);
}

function isPageSelector(selector: unknown): selector is PageSelector {
	const page =
		typeof selector === 'object' && selector !== null && 'page' in selector
			? selector.page
			: undefined;
	return (
		typeof selector === 'object' &&
		selector !== null &&
		'page' in selector &&
		Number.isInteger(page) &&
		typeof page === 'number' &&
		page > 0
	);
}

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	if (isPdfDocumentLocator(reference.locator)) {
		return reference.locator.path ?? reference.locator.uri ?? reference.type;
	}
	return reference.type;
}

function pageSuffix(selector: unknown): string {
	if (!isPageSelector(selector)) return '';
	return ` page ${selector.page}`;
}
