import { describe, expect, it, vi } from 'vitest';

import { FreePDFConverter } from '../free.js';

describe('FreePDFConverter', () => {
	it('returns empty markdown and locally rendered screenshots', async () => {
		const pdf = new Uint8Array([1, 2, 3]);
		const renderScreenshots = vi.fn(async () => [
			{ pageIndex: 1, data: 'page-2' },
		]);
		const converter = new FreePDFConverter({ renderScreenshots });

		const result = await converter.convertPDF(pdf, {
			pages: { startPage: 2, endPage: 2 },
		});

		expect(renderScreenshots).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 2 },
		});
		expect(result).toEqual({
			markdown: '',
			screenshots: [{ pageIndex: 1, data: 'page-2' }],
		});
	});
});
