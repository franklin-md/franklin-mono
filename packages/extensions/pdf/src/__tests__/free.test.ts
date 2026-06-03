import { describe, expect, it, vi, type MockedFunction } from 'vitest';
import { extractLinks, extractText } from 'unpdf';

import { FreePDFConverter } from '../providers/free.js';

vi.mock('unpdf', () => ({
	extractLinks: vi.fn(),
	extractText: vi.fn(),
}));

const extractLinksMock = vi.mocked(extractLinks);
const extractTextMock = vi.mocked(extractText) as unknown as MockedFunction<
	(
		pdf: Uint8Array,
		options: { mergePages: false },
	) => Promise<{ totalPages: number; text: string[] }>
>;

describe('FreePDFConverter', () => {
	it('returns extracted text markdown and locally rendered screenshots', async () => {
		const pdf = new Uint8Array([1, 2, 3]);
		extractTextMock.mockResolvedValue({
			totalPages: 3,
			text: ['First page', 'Second page', 'Third page'],
		});
		extractLinksMock.mockResolvedValue({
			totalPages: 3,
			links: ['https://example.com/a', 'https://example.com/b'],
		});
		const renderScreenshots = vi.fn(async () => [
			{ pageIndex: 1, data: 'page-2' },
		]);
		const converter = new FreePDFConverter({ renderScreenshots });

		const result = await converter.convertPDF(pdf, {
			pages: { startPage: 2, endPage: 2 },
		});

		expect(extractText).toHaveBeenCalledWith(new Uint8Array(pdf), {
			mergePages: false,
		});
		expect(extractLinks).toHaveBeenCalledWith(new Uint8Array(pdf));
		expect(renderScreenshots).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 2 },
		});
		expect(result).toEqual({
			markdown:
				'# Page 2\n\nSecond page\n\n## Links\n\n- https://example.com/a\n- https://example.com/b',
			screenshots: [{ pageIndex: 1, data: 'page-2' }],
		});
	});

	it('keeps page headers for blank extracted pages', async () => {
		extractTextMock.mockResolvedValue({
			totalPages: 2,
			text: ['Content', '   '],
		});
		extractLinksMock.mockResolvedValue({
			totalPages: 2,
			links: [],
		});
		const converter = new FreePDFConverter({
			renderScreenshots: vi.fn(async () => []),
		});

		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('# Page 1\n\nContent\n\n# Page 2');
	});
});
