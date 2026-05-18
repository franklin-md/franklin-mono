import { describe, expect, it, vi } from 'vitest';

import { convertPDF } from '../convert.js';

describe('convertPDF', () => {
	it('returns converted markdown text and screenshots as PNG images', async () => {
		const pdf = new Uint8Array([1]);
		const converter = {
			convertPDF: vi.fn(async () => ({
				markdown: ['# Page 2', 'converted pdf'].join('\n'),
				screenshots: [
					{ pageIndex: 1, data: 'page-2' },
					{ pageIndex: 2, data: 'page-3' },
				],
			})),
		};
		const result = await convertPDF(pdf, {
			pages: { startPage: 2, endPage: 3 },
			converter,
		});

		expect(converter.convertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 3 },
		});
		expect(result).toEqual({
			content: [
				{ type: 'text', text: '# Page 2\nconverted pdf' },
				{ type: 'image', data: 'page-2', mimeType: 'image/png' },
				{ type: 'image', data: 'page-3', mimeType: 'image/png' },
			],
		});
	});

	it('returns a concise error result when conversion fails', async () => {
		const result = await convertPDF(new Uint8Array([1]), {
			converter: {
				convertPDF: vi.fn(async () => {
					throw new Error('service unavailable');
				}),
			},
		});

		expect(result).toEqual({
			content: [
				{
					type: 'text',
					text: 'PDF processing failed: service unavailable',
				},
			],
			isError: true,
		});
	});
});
