import {
	renderPDFScreenshots,
	type RenderPDFScreenshots,
} from './screenshots.js';
import type { PDFConvertOptions, PDFConverter, PDFInput } from './types.js';

export interface FreePDFConverterOptions {
	readonly renderScreenshots?: RenderPDFScreenshots;
}

export class FreePDFConverter implements PDFConverter {
	private readonly renderScreenshots: RenderPDFScreenshots;

	constructor(options: FreePDFConverterOptions = {}) {
		this.renderScreenshots = options.renderScreenshots ?? renderPDFScreenshots;
	}

	async convertPDF(
		pdf: Uint8Array,
		options: PDFConvertOptions = {},
	): Promise<PDFInput> {
		return {
			markdown: '',
			screenshots: await this.renderScreenshots(pdf, options),
		};
	}
}
