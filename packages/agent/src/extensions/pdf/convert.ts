import type { ToolOutput } from '../../modules/core/api/tool.js';
import {
	PDF_SCREENSHOT_MIME_TYPE,
	type PDFConverter,
	type PDFPageRange,
} from './types.js';

export interface ConvertPDFOptions {
	readonly converter: PDFConverter;
	readonly pages?: PDFPageRange;
}

export async function convertPDF(
	pdf: Uint8Array,
	{ converter, pages }: ConvertPDFOptions,
): Promise<ToolOutput> {
	try {
		const converted = await converter.convertPDF(pdf, { pages });
		return {
			content: [
				{
					type: 'text',
					text: converted.markdown,
				},
				...converted.screenshots.map((screenshot) => ({
					type: 'image' as const,
					data: screenshot.data,
					mimeType: PDF_SCREENSHOT_MIME_TYPE,
				})),
			],
		};
	} catch (err: unknown) {
		return {
			content: [
				{
					type: 'text',
					text: `PDF processing failed: ${
						err instanceof Error ? err.message : String(err)
					}`,
				},
			],
			isError: true,
		};
	}
}
