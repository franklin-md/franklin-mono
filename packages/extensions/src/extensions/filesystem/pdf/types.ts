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

export interface PDFConverter {
	convertPDF(pdf: Uint8Array, options?: PDFConvertOptions): Promise<PDFInput>;
}

export interface PDFConvertOptions {
	readonly pages?: PDFPageRange;
}
