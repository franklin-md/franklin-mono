import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

export type PdfReferenceSelector = {
	readonly pages?: PdfPageRange;
};

export type PdfPageRange = {
	readonly start: number;
	readonly end: number;
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
	if (!selector) return {};
	// PDF selector examples:
	// - page=10 selects one page
	// - pages=10-12 selects an inclusive page range
	for (const part of selector.split(';')) {
		const [key, value] = part.split('=', 2);
		if (key !== 'page' && key !== 'pages') continue;
		const pages = parsePageRange(value);
		return pages ? { pages } : {};
	}
	return {};
}

function parsePageRange(value: string | undefined): PdfPageRange | undefined {
	if (!value) return undefined;
	const [startRaw, endRaw] = value.split('-', 2);
	const start = parsePageNumber(startRaw);
	const end = endRaw ? parsePageNumber(endRaw) : start;
	if (!start || !end || start > end) return undefined;
	return { start, end };
}

function parsePageNumber(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : undefined;
}
