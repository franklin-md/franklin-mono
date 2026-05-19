import type { PDFPageRange } from './types.js';

export function isPDFPageInRange(
	pageNumber: number,
	range: PDFPageRange | undefined,
) {
	return (
		!range ||
		(pageNumber >= range.startPage &&
			(range.endPage === undefined || pageNumber <= range.endPage))
	);
}
