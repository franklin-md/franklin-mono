import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { ParsedSelector } from '../../modules/references/selectors/index.js';

export type PdfReferenceSelector = {
	readonly pages?: PdfPageRange;
};

export type PdfPageRange = {
	readonly start: number;
	readonly end: number;
};

const pdfDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			reference.type === 'pdf.document' ||
			reference.data?.mime === 'application/pdf'
		);
	},
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

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	return reference.locator;
}

function pageSuffix(selector: string | undefined): string {
	const pdfSelector = parsePdfReferenceSelector(selector);
	const pages = pdfSelector.pages;
	if (!pages) return '';
	if (pages.start === pages.end) return ` page ${pages.start}`;
	return ` pages ${pages.start}-${pages.end}`;
}

export function parsePdfReferenceSelector(
	selector: string | undefined,
): PdfReferenceSelector {
	// PDF selector examples:
	// - page=10 selects one page
	// - pages=10-12 selects an inclusive page range
	const parsed = ParsedSelector.parse(selector);
	const pages =
		parsed.integerRange('pages', { min: 1 }) ??
		parsed.integerRange('page', { min: 1 });
	return pages ? { pages } : {};
}
