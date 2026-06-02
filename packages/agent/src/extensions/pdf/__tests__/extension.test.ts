import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthManager } from '../../../auth/manager.js';
import type { ReconfigurableEnvironment } from '../../../modules/environment/api/types.js';
import { compileCoreWithStoreEnvAndAuth } from '../../../testing/compile-ext.js';
import { editExtension } from '../../filesystem/edit/extension.js';
import { readPDFExtension } from '../extension.js';
import type { PDFConverter } from '../types.js';

const pdfMocks = vi.hoisted(() => ({
	freeConstructor: vi.fn(),
	freeConvertPDF: vi.fn<PDFConverter['convertPDF']>(),
	mistralConstructor: vi.fn(),
	mistralConvertPDF: vi.fn<PDFConverter['convertPDF']>(),
}));

vi.mock('../providers/free.js', () => ({
	FreePDFConverter: vi.fn(function (options) {
		pdfMocks.freeConstructor(options);
		return { convertPDF: pdfMocks.freeConvertPDF };
	}),
}));

vi.mock('../providers/mistral.js', () => ({
	MistralPDFConverter: vi.fn(function (options) {
		pdfMocks.mistralConstructor(options);
		return { convertPDF: pdfMocks.mistralConvertPDF };
	}),
}));

function mockEnvironment(file: Uint8Array): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(async () => file),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async () => true),
			glob: vi.fn(async () => []),
			deleteFile: vi.fn(async () => {}),
			resolve: vi.fn(async (path: string) => path as AbsolutePath),
		},
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function mockAuthManager(apiKey?: string): AuthManager & {
	getApiKey: ReturnType<typeof vi.fn>;
} {
	return {
		getApiKey: vi.fn(async () => apiKey),
	} as unknown as AuthManager & { getApiKey: ReturnType<typeof vi.fn> };
}

describe('readPDFExtension', () => {
	beforeEach(() => {
		pdfMocks.freeConstructor.mockClear();
		pdfMocks.freeConvertPDF.mockReset();
		pdfMocks.mistralConstructor.mockClear();
		pdfMocks.mistralConvertPDF.mockReset();
		pdfMocks.freeConvertPDF.mockResolvedValue({
			markdown: 'free',
			screenshots: [],
		});
		pdfMocks.mistralConvertPDF.mockResolvedValue({
			markdown: 'mistral',
			screenshots: [],
		});
	});

	it('routes PDFs through the PDF converter with page ranges', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const auth = mockAuthManager();
		const renderScreenshots = vi.fn(async () => []);
		pdfMocks.freeConvertPDF.mockResolvedValue({
			markdown: 'converted pdf',
			screenshots: [],
		});
		const compiled = await compileCoreWithStoreEnvAndAuth(
			(api) => {
				editExtension()(api);
				readPDFExtension({ renderScreenshots })(api);
			},
			env,
			auth,
		);

		const result = await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'read-1',
					name: 'read_pdf',
					arguments: {
						path: 'document.pdf',
						start_page: 2,
						end_page: 4,
					},
				},
			},
			vi.fn(),
		);

		expect(auth.getApiKey).toHaveBeenCalledWith('mistral');
		expect(pdfMocks.freeConstructor).toHaveBeenCalledWith({
			renderScreenshots,
		});
		expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 4 },
		});
		expect(pdfMocks.mistralConstructor).not.toHaveBeenCalled();
		expect(result.content).toEqual([{ type: 'text', text: 'converted pdf' }]);
	});

	it('defaults missing page range boundaries', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const auth = mockAuthManager();
		const renderScreenshots = vi.fn(async () => []);
		const compiled = await compileCoreWithStoreEnvAndAuth(
			(api) => {
				editExtension()(api);
				readPDFExtension({ renderScreenshots })(api);
			},
			env,
			auth,
		);

		await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'read-1',
					name: 'read_pdf',
					arguments: {
						path: 'document.pdf',
						end_page: 4,
					},
				},
			},
			vi.fn(),
		);

		expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 1, endPage: 4 },
		});
	});

	it('selects Mistral from the runtime auth dependency', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const auth = mockAuthManager('mis-key');
		const renderScreenshots = vi.fn(async () => []);
		const compiled = await compileCoreWithStoreEnvAndAuth(
			(api) => {
				editExtension()(api);
				readPDFExtension({ renderScreenshots })(api);
			},
			env,
			auth,
		);

		const result = await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'read-1',
					name: 'read_pdf',
					arguments: { path: 'document.pdf' },
				},
			},
			vi.fn(),
		);

		expect(auth.getApiKey).toHaveBeenCalledWith('mistral');
		expect(pdfMocks.mistralConstructor).toHaveBeenCalledWith({
			apiKey: 'mis-key',
			renderScreenshots,
		});
		expect(pdfMocks.mistralConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: undefined,
		});
		expect(pdfMocks.freeConvertPDF).not.toHaveBeenCalled();
		expect(result.content).toEqual([{ type: 'text', text: 'mistral' }]);
	});
});
