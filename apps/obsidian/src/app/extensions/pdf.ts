import {
	FreePDFConverter,
	isPDFPageInRange,
	PDF_SCREENSHOT_DPI,
	type RenderPDFScreenshots,
} from '@franklin/extensions';
import { getDocumentProxy, renderPageAsImage } from 'unpdf';

const PDF_POINTS_PER_INCH = 72;
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

export function createObsidianPDFConverter() {
	return new FreePDFConverter({
		renderScreenshots: renderObsidianPDFScreenshots,
	});
}

const renderObsidianPDFScreenshots: RenderPDFScreenshots = async (
	pdf,
	options = {},
) => {
	const document = await getDocumentProxy(new Uint8Array(pdf));
	try {
		const screenshots = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			if (!isPDFPageInRange(pageNumber, options.pages)) {
				continue;
			}
			const dataUrl = await renderPageAsImage(document, pageNumber, {
				scale: PDF_SCREENSHOT_DPI / PDF_POINTS_PER_INCH,
				toDataURL: true,
			});
			screenshots.push({
				pageIndex: pageNumber - 1,
				data: stripPNGDataURL(dataUrl),
			});
		}
		return screenshots;
	} finally {
		await document.destroy();
	}
};

function stripPNGDataURL(dataUrl: string): string {
	if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
		throw new Error('PDF screenshot renderer returned a non-PNG data URL.');
	}
	return dataUrl.slice(PNG_DATA_URL_PREFIX.length);
}
