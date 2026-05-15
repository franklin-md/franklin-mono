export const PDF_SCREENSHOT_DPI = 150;
export const PDF_SCREENSHOT_MIME_TYPE = 'image/png';

export interface PDFScreenshot {
	readonly pageIndex: number;
	readonly data: string;
}

export interface PDFPageRange {
	readonly startPage: number;
	readonly endPage: number;
}

export interface PDFInput {
	readonly markdown: string;
	readonly screenshots: readonly PDFScreenshot[];
}

export interface RenderPDFScreenshotsOptions {
	readonly pages?: PDFPageRange;
}

export type RenderPDFScreenshots = (
	pdf: Uint8Array,
	options?: RenderPDFScreenshotsOptions,
) => Promise<readonly PDFScreenshot[]>;

export interface PDFConverterOptions {
	readonly renderScreenshots: RenderPDFScreenshots;
}

export interface PDFConverter {
	convertPDF(pdf: Uint8Array, options?: PDFConvertOptions): Promise<PDFInput>;
}

export interface PDFConvertOptions {
	readonly pages?: PDFPageRange;
}
