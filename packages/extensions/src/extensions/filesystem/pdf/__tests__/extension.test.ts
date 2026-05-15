import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { compileCoreWithStoreAndEnv } from '../../../../testing/compile-ext.js';
import { editExtension } from '../../edit/extension.js';
import { readPDFExtension } from '../extension.js';

vi.mock('file-type', () => ({
	fileTypeFromBuffer: vi.fn(async () => ({
		ext: 'pdf',
		mime: 'application/pdf',
	})),
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

describe('readPDFExtension', () => {
	it('routes PDFs through the PDF converter with page ranges', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const pdfConverter = {
			convertPDF: vi.fn(async () => ({
				markdown: 'converted pdf',
				screenshots: [],
			})),
		};
		const compiled = await compileCoreWithStoreAndEnv((api) => {
			editExtension()(api);
			readPDFExtension({ pdfConverter })(api);
		}, env);

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

		expect(pdfConverter.convertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 4 },
		});
		expect(result.content).toEqual([{ type: 'text', text: 'converted pdf' }]);
	});

	it('defaults missing page range boundaries', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const pdfConverter = {
			convertPDF: vi.fn(async () => ({
				markdown: 'converted pdf',
				screenshots: [],
			})),
		};
		const compiled = await compileCoreWithStoreAndEnv((api) => {
			editExtension()(api);
			readPDFExtension({ pdfConverter })(api);
		}, env);

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

		expect(pdfConverter.convertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 1, endPage: 4 },
		});
	});
});
