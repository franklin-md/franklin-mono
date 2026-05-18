import { extractLinks, extractText } from 'unpdf';
import { isPDFPageInRange } from './page-range.js';
import type {
	PDFConvertOptions,
	PDFConverter,
	PDFInput,
	PDFPageRange,
	RenderPDFScreenshots,
} from './types.js';

interface FreePDFConverterOptions {
	readonly renderScreenshots: RenderPDFScreenshots;
}

export class FreePDFConverter implements PDFConverter {
	private readonly renderScreenshots: RenderPDFScreenshots;

	constructor(options: FreePDFConverterOptions) {
		this.renderScreenshots = options.renderScreenshots;
	}

	async convertPDF(
		pdf: Uint8Array,
		options: PDFConvertOptions = {},
	): Promise<PDFInput> {
		const [text, links, screenshots] = await Promise.all([
			extractText(new Uint8Array(pdf), { mergePages: false }),
			extractLinks(new Uint8Array(pdf)),
			this.renderScreenshots(pdf, options),
		]);

		return {
			markdown: formatMarkdown(text.text, links.links, options.pages),
			screenshots,
		};
	}
}

function formatMarkdown(
	pages: readonly string[],
	links: readonly string[],
	range: PDFPageRange | undefined,
): string {
	return [...formatExtractedText(pages, range), ...formatLinks(links)].join(
		'\n\n',
	);
}

function formatExtractedText(
	pages: readonly string[],
	range: PDFPageRange | undefined,
): string[] {
	return pages.flatMap((text, index) => {
		const pageNumber = index + 1;
		if (!isPDFPageInRange(pageNumber, range)) {
			return [];
		}
		const normalized = text.trim();
		return normalized
			? [`# Page ${pageNumber}\n\n${normalized}`]
			: [`# Page ${pageNumber}`];
	});
}

function formatLinks(links: readonly string[]): string[] {
	if (links.length === 0) {
		return [];
	}
	return [`## Links\n\n${links.map((link) => `- ${link}`).join('\n')}`];
}
