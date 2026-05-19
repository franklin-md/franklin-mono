import { describe, expect, it, vi } from 'vitest';

import { MistralPDFConverter, formatOCRMarkdown } from '../mistral.js';
import { PDF_SCREENSHOT_DPI } from '../types.js';

describe('MistralPDFConverter', () => {
	it('uploads the PDF, runs Mistral OCR, and returns screenshots', async () => {
		const pdf = new Uint8Array([1, 2, 3]);
		const upload = vi.fn(async () => ({ id: 'file-1' }));
		const process = vi.fn(async () => ({
			pages: [
				{
					index: 0,
					header: 'Header text',
					markdown: 'Body ![chart](chart.png)\n\n| A |\n| - |\n| B |',
					footer: 'Footer text',
				},
			],
		}));
		const renderScreenshots = vi.fn(async () => [
			{ pageIndex: 0, data: 'page-image' },
		]);

		const converter = new MistralPDFConverter({
			apiKey: 'test-key',
			createClient: () => ({
				files: { upload },
				ocr: { process },
			}),
			renderScreenshots,
		});

		const result = await converter.convertPDF(pdf, {
			pages: { startPage: 2, endPage: 4 },
		});

		expect(upload).toHaveBeenCalledWith({
			file: { fileName: 'document.pdf', content: pdf },
			purpose: 'ocr',
		});
		expect(process).toHaveBeenCalledWith({
			model: 'mistral-ocr-latest',
			document: { type: 'file', fileId: 'file-1' },
			includeImageBase64: false,
			tableFormat: null,
			extractHeader: true,
			extractFooter: true,
			pages: '1-3',
		});
		expect(renderScreenshots).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 4 },
		});
		expect(result).toEqual({
			markdown:
				'# Page 1\n\n## Header\n\nHeader text\n\nBody [IMAGE]\n\n| A |\n| - |\n| B |\n\n## Footer\n\nFooter text',
			screenshots: [{ pageIndex: 0, data: 'page-image' }],
		});
	});

	it('requires a Mistral API key', () => {
		expect(
			() =>
				new MistralPDFConverter({
					apiKey: '',
					createClient: vi.fn(),
					renderScreenshots: vi.fn(),
				}),
		).toThrow('Mistral API key is required');
	});

	it('reuses the Mistral client across conversions', async () => {
		const upload = vi.fn(async () => ({ id: 'file-1' }));
		const process = vi.fn(async () => ({ pages: [] }));
		const createClient = vi.fn(() => ({
			files: { upload },
			ocr: { process },
		}));
		const converter = new MistralPDFConverter({
			apiKey: 'test-key',
			createClient,
			renderScreenshots: vi.fn(async () => []),
		});

		await converter.convertPDF(new Uint8Array([1]));
		await converter.convertPDF(new Uint8Array([2]));

		expect(createClient).toHaveBeenCalledOnce();
	});

	it('formats pages in index order and preserves inline tables', () => {
		const result = formatOCRMarkdown([
			{
				index: 1,
				markdown: 'Second',
			},
			{
				index: 0,
				markdown: 'First ![image](image.jpeg)\n\n| H |\n| - |',
			},
		]);

		expect(result).toBe(
			'# Page 1\n\nFirst [IMAGE]\n\n| H |\n| - |\n\n# Page 2\n\nSecond',
		);
	});

	it('uses the agreed screenshot DPI constant', () => {
		expect(PDF_SCREENSHOT_DPI).toBe(150);
	});

	it('formats a single requested page for Mistral', async () => {
		const upload = vi.fn(async () => ({ id: 'file-1' }));
		const process = vi.fn(async () => ({ pages: [] }));
		const converter = new MistralPDFConverter({
			apiKey: 'test-key',
			createClient: () => ({
				files: { upload },
				ocr: { process },
			}),
			renderScreenshots: vi.fn(async () => []),
		});

		await converter.convertPDF(new Uint8Array([1]), {
			pages: { startPage: 3, endPage: 3 },
		});

		expect(process).toHaveBeenCalledWith(
			expect.objectContaining({ pages: '2' }),
		);
	});

	it('formats an open-ended page range for Mistral', async () => {
		const upload = vi.fn(async () => ({ id: 'file-1' }));
		const process = vi.fn(async () => ({ pages: [] }));
		const converter = new MistralPDFConverter({
			apiKey: 'test-key',
			createClient: () => ({
				files: { upload },
				ocr: { process },
			}),
			renderScreenshots: vi.fn(async () => []),
		});

		await converter.convertPDF(new Uint8Array([1]), {
			pages: { startPage: 3 },
		});

		expect(process).toHaveBeenCalledWith(
			expect.objectContaining({ pages: '2-' }),
		);
	});
});
