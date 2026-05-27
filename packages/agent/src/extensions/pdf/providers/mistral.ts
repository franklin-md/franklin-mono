import { Mistral } from '@mistralai/mistralai';

import type {
	PDFConvertOptions,
	PDFConverter,
	PDFConverterOptions,
	PDFInput,
	PDFPageRange,
	RenderPDFScreenshots,
} from '../types.js';

interface MistralFileUploadResponse {
	readonly id: string;
}

interface MistralOCRPage {
	readonly index: number;
	readonly markdown: string;
	readonly header?: string | null;
	readonly footer?: string | null;
}

interface MistralOCRResponse {
	readonly pages: readonly MistralOCRPage[];
}

interface MistralClient {
	readonly files: {
		upload(request: {
			file: { fileName: string; content: Uint8Array };
			purpose: 'ocr';
		}): Promise<MistralFileUploadResponse>;
	};
	readonly ocr: {
		process(request: {
			model: string;
			document: { type: 'file'; fileId: string };
			includeImageBase64: boolean;
			tableFormat: null;
			extractHeader: boolean;
			extractFooter: boolean;
			pages?: string;
		}): Promise<MistralOCRResponse>;
	};
}

interface MistralPDFConverterOptions extends PDFConverterOptions {
	readonly apiKey?: string;
	readonly createClient?: (apiKey: string) => MistralClient;
}

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\([^)]*\)/g;

export class MistralPDFConverter implements PDFConverter {
	private readonly client: MistralClient;
	private readonly renderScreenshots: RenderPDFScreenshots;

	constructor(options: MistralPDFConverterOptions) {
		if (!options.apiKey) {
			throw new Error('Mistral API key is required for Mistral PDF OCR');
		}

		const createClient =
			options.createClient ?? ((key) => new Mistral({ apiKey: key }));
		this.client = createClient(options.apiKey);
		this.renderScreenshots = options.renderScreenshots;
	}

	async convertPDF(
		pdf: Uint8Array,
		options: PDFConvertOptions = {},
	): Promise<PDFInput> {
		const [ocrResponse, screenshots] = await Promise.all([
			this.ocrPDF(this.client, pdf, options),
			this.renderScreenshots(pdf, options),
		]);

		return {
			markdown: formatOCRMarkdown(ocrResponse.pages),
			screenshots,
		};
	}

	private async ocrPDF(
		client: MistralClient,
		pdf: Uint8Array,
		options: PDFConvertOptions,
	): Promise<MistralOCRResponse> {
		const uploaded = await client.files.upload({
			file: {
				fileName: 'document.pdf',
				content: pdf,
			},
			purpose: 'ocr',
		});

		return client.ocr.process({
			model: 'mistral-ocr-latest',
			document: { type: 'file', fileId: uploaded.id },
			includeImageBase64: false,
			tableFormat: null,
			extractHeader: true,
			extractFooter: true,
			...(options.pages ? { pages: formatMistralPages(options.pages) } : {}),
		});
	}
}

function formatMistralPages(range: PDFPageRange): string {
	const startPage = range.startPage - 1;
	if (range.endPage === undefined) {
		return `${startPage}-`;
	}
	const endPage = range.endPage - 1;
	return startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`;
}

export function formatOCRMarkdown(pages: readonly MistralOCRPage[]): string {
	return [...pages]
		.sort((a, b) => a.index - b.index)
		.map(formatPage)
		.join('\n\n');
}

function formatPage(page: MistralOCRPage): string {
	const sections = [`# Page ${page.index + 1}`];
	appendSection(sections, '## Header', page.header);
	appendSection(sections, undefined, page.markdown);
	appendSection(sections, '## Footer', page.footer);
	return sections.join('\n\n');
}

function appendSection(
	sections: string[],
	heading: string | undefined,
	markdown: string | null | undefined,
): void {
	if (!markdown) {
		return;
	}
	const normalized = stripImageLinks(markdown);
	if (!normalized) {
		return;
	}
	if (heading) {
		sections.push(heading, normalized);
		return;
	}
	sections.push(normalized);
}

function stripImageLinks(markdown: string): string {
	return markdown.replace(IMAGE_MARKDOWN_PATTERN, '[IMAGE]').trim();
}
