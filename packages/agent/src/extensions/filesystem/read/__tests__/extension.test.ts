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

async function executeReadFile(file: Uint8Array, path: string) {
	const env = mockEnvironment(file);
	const compiled = await compileCoreWithStoreAndEnv((api) => {
		editExtension()(api);
		readExtension()(api);
	}, env);

	return compiled.middleware.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'read-1',
				name: 'read_file',
				arguments: {
					path,
					limit: 10,
					offset: 1,
				},
			},
		},
		vi.fn(),
	);
}

describe('readExtension', () => {
	it('reads files detected as text MIME as text', async () => {
		const textWithUtf8Bom = Uint8Array.from([
			0xef, 0xbb, 0xbf, 0x61, 0x6c, 0x70, 0x68, 0x61, 0x0a, 0x62, 0x65, 0x74,
			0x61,
		]);

		await expect(
			executeReadFile(textWithUtf8Bom, 'note.md'),
		).resolves.toMatchObject({
			content: [{ type: 'text', text: 'alpha\nbeta' }],
		});
	});

	it('reads SVG files as text', async () => {
		const svg = new TextEncoder().encode('<svg><title>alpha</title></svg>');

		await expect(executeReadFile(svg, 'icon.svg')).resolves.toMatchObject({
			content: [{ type: 'text', text: '<svg><title>alpha</title></svg>' }],
		});
	});

	it('reports PDFs as unsupported', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');

		const result = await executeReadFile(pdf, 'document.pdf');

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
