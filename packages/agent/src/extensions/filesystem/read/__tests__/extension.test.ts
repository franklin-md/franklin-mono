import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { compileCoreWithStoreAndEnv } from '../../../../testing/compile-ext.js';
import { editExtension } from '../../edit/extension.js';
import { fileKey } from '../../common/key.js';
import { sha256Hex } from '../../hash.js';
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

	const result = await compiled.middleware.server.toolExecute(
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
	return { result, compiled, env };
}

describe('readExtension', () => {
	it.each([
		['invalid UTF-8', Uint8Array.from([0xff, 0x0a, 0x61])],
		['NUL-containing text', new TextEncoder().encode('above\0\ntarget')],
		['PDF', new TextEncoder().encode('%PDF-1.7\ntarget')],
		['ZIP', Uint8Array.from([0x50, 0x4b, 0x03, 0x04])],
		['PNG', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
	] as const)(
		'keeps %s reads hash-only and rejects stale edits',
		async (_name, bytes) => {
			const { compiled, env } = await executeReadFile(bytes, 'file');
			expect(compiled.ctx.getStore(fileKey).get()).toEqual({
				file: sha256Hex(bytes),
			});
			vi.mocked(env.filesystem.readFile).mockResolvedValue(
				new TextEncoder().encode('user above\ntarget'),
			);
			const result = await compiled.middleware.server.toolExecute(
				{
					call: {
						type: 'toolCall',
						id: 'edit-1',
						name: 'edit_file',
						arguments: {
							path: 'file',
							old_text: 'target',
							new_text: 'replacement',
						},
					},
				},
				vi.fn(),
			);
			expect(result).toMatchObject({
				isError: true,
				content: [{ type: 'text', text: expect.stringContaining('Reread') }],
			});
			expect(env.filesystem.writeFile).not.toHaveBeenCalled();
		},
	);

	it('retains a full text snapshot when the returned read is truncated', async () => {
		const text = Array.from(
			{ length: 12 },
			(_, index) => `line ${index + 1}`,
		).join('\r\n');
		const bytes = new TextEncoder().encode('\uFEFF' + text);
		const { result, compiled } = await executeReadFile(bytes, 'note.md');
		expect(result).toMatchObject({
			content: [
				{ type: 'text', text: text.split('\n').slice(0, 10).join('\n') },
			],
		});
		expect(compiled.ctx.getStore(fileKey).get()).toEqual({
			'note.md': { hash: sha256Hex(bytes), text },
		});
	});

	it('reads files detected as text MIME as text', async () => {
		const textWithUtf8Bom = Uint8Array.from([
			0xef, 0xbb, 0xbf, 0x61, 0x6c, 0x70, 0x68, 0x61, 0x0a, 0x62, 0x65, 0x74,
			0x61,
		]);

		const { result } = await executeReadFile(textWithUtf8Bom, 'note.md');
		expect(result).toMatchObject({
			content: [{ type: 'text', text: 'alpha\nbeta' }],
		});
	});

	it('reads SVG files as text', async () => {
		const svg = new TextEncoder().encode('<svg><title>alpha</title></svg>');

		const { result } = await executeReadFile(svg, 'icon.svg');
		expect(result).toMatchObject({
			content: [{ type: 'text', text: '<svg><title>alpha</title></svg>' }],
		});
	});

	it('reports PDFs as unsupported', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');

		const { result } = await executeReadFile(pdf, 'document.pdf');

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
