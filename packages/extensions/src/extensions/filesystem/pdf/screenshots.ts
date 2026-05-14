import { PDFiumLibrary, type PDFiumPageRenderOptions } from '@hyzyla/pdfium';
import sharp from 'sharp';

import type { PDFPageRange, PDFScreenshot } from './types.js';

export const PDF_SCREENSHOT_DPI = 150;
export const PDF_SCREENSHOT_MIME_TYPE = 'image/png';

export type RenderPDFScreenshots = (
	pdf: Uint8Array,
	options?: RenderPDFScreenshotsOptions,
) => Promise<readonly PDFScreenshot[]>;

export interface RenderPDFScreenshotsOptions {
	readonly pages?: PDFPageRange;
}

export const renderPDFScreenshots: RenderPDFScreenshots = async (
	pdf,
	options = {},
) => {
	const pdfium = await PDFiumLibrary.init();
	const document = await pdfium.loadDocument(Buffer.from(pdf));
	try {
		const screenshots: PDFScreenshot[] = [];
		for (const page of document.pages()) {
			if (!isPageInRange(page.number, options.pages)) {
				continue;
			}
			const image = await page.render({
				scale: PDF_SCREENSHOT_DPI / 72,
				render: renderPNG,
			});
			screenshots.push({
				pageIndex: page.number - 1,
				data: Buffer.from(image.data).toString('base64'),
			});
		}
		return screenshots;
	} finally {
		document.destroy();
		pdfium.destroy();
	}
};

function isPageInRange(pageNumber: number, range: PDFPageRange | undefined) {
	return (
		!range || (pageNumber >= range.startPage && pageNumber <= range.endPage)
	);
}

async function renderPNG(
	options: PDFiumPageRenderOptions,
): Promise<Uint8Array> {
	return sharp(options.data, {
		raw: {
			width: options.width,
			height: options.height,
			channels: 4,
		},
	})
		.png({ compressionLevel: 6 })
		.withMetadata({ density: PDF_SCREENSHOT_DPI })
		.toBuffer();
}
