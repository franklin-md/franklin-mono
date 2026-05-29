import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { compileCoreWithStoreAndEnv } from '../../../../testing/compile-ext.js';
import { editExtension } from '../../edit/extension.js';
import { readExtension } from '../extension.js';

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

describe('readExtension', () => {
	it('reports PDFs as unsupported', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const env = mockEnvironment(pdf);
		const compiled = await compileCoreWithStoreAndEnv((api) => {
			editExtension()(api);
			readExtension()(api);
		}, env);

		const result = await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'read-1',
					name: 'read_file',
					arguments: {
						path: 'document.pdf',
						limit: 3,
						offset: 2,
					},
				},
			},
			vi.fn(),
		);

		expect(result).toMatchObject({
			content: [
				{
					type: 'text',
					text: 'PDF files are not supported by this reader.',
				},
			],
			isError: true,
		});
	});
});
