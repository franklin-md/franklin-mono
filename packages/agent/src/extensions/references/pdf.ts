import type {
	AuthDependencyModule,
	AuthDependencyRuntime,
} from '../../auth/dependency.js';
import type { CoreModule } from '../../modules/core/index.js';
import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
	ReferenceHandlerRuntime,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import {
	ParsedSelector,
	parseSelectorIntegerRangeValue,
} from '../../modules/references/selectors/index.js';
import { convertPDF } from '../pdf/convert.js';
import { createPDFConverterResolver } from '../pdf/resolve-converter.js';
import type { ReadPDFExtensionOptions, PDFPageRange } from '../pdf/types.js';
import { hasBytesData } from './data.js';

export const PDF_REFERENCE_TYPE = 'pdf';

export type PdfReferenceSelector = {
	readonly pages?: PdfPageRange;
};

export type PdfPageRange = {
	readonly start: number;
	readonly end: number;
};

// PDF conversion can invoke OCR and screenshot rendering, so page count is the
// cost boundary. Ten pages is enough for section-level reading while keeping
// pagination predictable with pages=N-M.
const PDF_MATERIALIZATION_PAGE_LIMIT = 10;

type PDFReferenceRuntime = ReferenceHandlerRuntime & AuthDependencyRuntime;

export function createPDFDocumentReferenceExtension({
	renderScreenshots,
}: ReadPDFExtensionOptions) {
	const resolvePDFConverter = createPDFConverterResolver({ renderScreenshots });
	const pdfDocumentReferenceHandler: ReferenceHandler<PDFReferenceRuntime> = {
		test(reference) {
			return (
				reference.type === PDF_REFERENCE_TYPE ||
				reference.data?.mime === 'application/pdf'
			);
		},
		async toContext(reference, _delegate, runtime) {
			if (!hasBytesData(reference)) {
				const label = referenceLabel(reference);
				const page = pageSuffix(reference.selector);
				return {
					content: [
						{
							type: 'text',
							text: `PDF reference unavailable: ${label}${page}. PDF bytes are required for extraction.`,
						},
					],
					isError: true,
				};
			}

			const selection = selectPDFPages(reference.selector);
			if (selection.issue) {
				return {
					content: [
						{
							type: 'text',
							text: formatReferenceText(reference, selection.issue),
						},
					],
				};
			}

			const converter = await resolvePDFConverter(runtime);
			const converted = await convertPDF(reference.data.bytes, {
				converter,
				pages: toPDFPageRange(selection.pages),
			});
			if (converted.isError) return converted;
			return {
				content: [
					{
						type: 'text',
						text: formatReferenceText(reference, selection.note),
					},
					...converted.content,
				],
			};
		},
	};

	return defineExtension<[ReferencesModule, AuthDependencyModule, CoreModule]>(
		(api) => {
			api.registerReferenceHandler(pdfDocumentReferenceHandler);
			api.on('systemPrompt', (prompt) => {
				prompt.setPart(
					'Reading PDFs is supported.\nSupported selectors:\n- page=N\n- pages=N-M',
					{ once: true },
				);
			});
		},
	);
}

function referenceLabel(reference: Reference): string {
	if (reference.label) return reference.label;
	return reference.locator;
}

function formatReferenceText(
	reference: Reference,
	note: string | undefined,
): string {
	const header = `Reference: ${referenceLabel(reference)}`;
	return note ? `${header}\n\n${note}` : header;
}

function pageSuffix(selector: string | undefined): string {
	const pages = parsePdfReferenceSelector(selector).pages;
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

function toPDFPageRange(pages: PdfPageRange): PDFPageRange {
	return { startPage: pages.start, endPage: pages.end };
}

type PDFPageSelection = {
	readonly pages: PdfPageRange;
	readonly note?: string;
	readonly issue?: string;
};

function selectPDFPages(selector: string | undefined): PDFPageSelection {
	const parsed = ParsedSelector.parse(selector);
	const rawPages = parsed.string('pages');
	if (rawPages !== undefined) {
		return boundPDFPages('pages', rawPages);
	}

	const rawPage = parsed.string('page');
	if (rawPage !== undefined) {
		return boundPDFPages('page', rawPage);
	}

	return {
		pages: { start: 1, end: PDF_MATERIALIZATION_PAGE_LIMIT },
		note: `PDF materialization limited: showing up to pages 1-${PDF_MATERIALIZATION_PAGE_LIMIT}. Continue with selector "pages=${
			PDF_MATERIALIZATION_PAGE_LIMIT + 1
		}-${PDF_MATERIALIZATION_PAGE_LIMIT * 2}" if needed.`,
	};
}

function boundPDFPages(
	field: 'page' | 'pages',
	value: string,
): PDFPageSelection {
	const parsedRange = parseSelectorIntegerRangeValue(value, { min: 1 });
	if (!parsedRange.ok) {
		const reversed = parsedRange.reversed;
		if (reversed) {
			return {
				pages: { start: 1, end: PDF_MATERIALIZATION_PAGE_LIMIT },
				issue: `No PDF pages selected: selector "${field}=${value}" starts after it ends. Use pages=${reversed.end}-${reversed.start} to read that range.`,
			};
		}
		return {
			pages: { start: 1, end: PDF_MATERIALIZATION_PAGE_LIMIT },
			issue: `No PDF pages selected: selector "${field}=${value}" is invalid. Use pages=N-M to read a bounded range.`,
		};
	}

	const range = parsedRange.range;
	const boundedEnd = Math.min(
		range.end,
		range.start + PDF_MATERIALIZATION_PAGE_LIMIT - 1,
	);
	if (boundedEnd === range.end) {
		return { pages: range };
	}

	return {
		pages: { start: range.start, end: boundedEnd },
		note: `PDF materialization limited: requested pages ${range.start}-${range.end}, showing pages ${range.start}-${boundedEnd}. Continue with selector "pages=${
			boundedEnd + 1
		}-${range.end}".`,
	};
}
