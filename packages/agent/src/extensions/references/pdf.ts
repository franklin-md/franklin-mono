import type {
	AuthDependencyModule,
	AuthDependencyRuntime,
} from '../../auth/dependency.js';
import { defineExtension } from '../../modules/state/index.js';
import type {
	Reference,
	ReferenceHandler,
	ReferenceHandlerRuntime,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { ParsedSelector } from '../../modules/references/selectors/index.js';
import { convertPDF } from '../pdf/convert.js';
import { createPDFConverterResolver } from '../pdf/resolve-converter.js';
import type { ReadPDFExtensionOptions, PDFPageRange } from '../pdf/types.js';

export type PdfReferenceSelector = {
	readonly pages?: PdfPageRange;
};

export type PdfPageRange = {
	readonly start: number;
	readonly end: number;
};

type PDFReferenceRuntime = ReferenceHandlerRuntime & AuthDependencyRuntime;

export function createPDFDocumentReferenceExtension({
	renderScreenshots,
}: ReadPDFExtensionOptions) {
	const resolvePDFConverter = createPDFConverterResolver({ renderScreenshots });
	const pdfDocumentReferenceHandler: ReferenceHandler<PDFReferenceRuntime> = {
		test(reference) {
			return (
				reference.type === 'pdf.document' ||
				reference.data?.mime === 'application/pdf'
			);
		},
		async toContext(reference, _delegate, runtime) {
			if (reference.data?.type !== 'bytes') {
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

			const converter = await resolvePDFConverter(runtime);
			const converted = await convertPDF(reference.data.bytes, {
				converter,
				pages: toPDFPageRange(reference.selector),
			});
			return { content: converted.content };
		},
	};

	return defineExtension<[ReferencesModule, AuthDependencyModule]>((api) => {
		api.registerReferenceHandler(pdfDocumentReferenceHandler);
	});
}

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

function toPDFPageRange(
	selector: string | undefined,
): PDFPageRange | undefined {
	const pages = parsePdfReferenceSelector(selector).pages;
	if (!pages) return undefined;
	return { startPage: pages.start, endPage: pages.end };
}
