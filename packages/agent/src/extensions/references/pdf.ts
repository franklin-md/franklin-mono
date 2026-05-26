import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

type PageSelector = {
	readonly page: number;
};

const pdfDocumentReferenceHandler: ReferenceHandler = {
	type: 'pdf.document',
	toContext(reference) {
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

export const pdfDocumentReferenceExtension = defineExtension<
	[ReferencesModule]
>((api) => {
	api.registerReferenceHandler(pdfDocumentReferenceHandler);
});

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
	return reference.locator;
}

function pageSuffix(selector: unknown): string {
	if (!isPageSelector(selector)) return '';
	return ` page ${selector.page}`;
}
