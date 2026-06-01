import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	base64,
	decode,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import {
	createMockMiniACP,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { describe, expect, it, vi } from 'vitest';

import { createRuntime } from '../../../testing/index.js';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	createReferencesModule,
	createStoreStateModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '../../../modules/index.js';
import { StoreRegistry } from '../../../modules/store/api/registry/index.js';
import { fileKey } from '../../filesystem/common/key.js';
import { editExtension } from '../../filesystem/edit/extension.js';
import {
	filesystemFileReferenceExtension,
	imageDocumentReferenceExtension,
	referenceReadExtension,
	textDocumentReferenceExtension,
} from '../index.js';

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function createEnvironment(filesystem: Filesystem): ReconfigurableEnvironment {
	return {
		filesystem,
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => defaultConfig),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function createReferenceReadRuntime(
	filesystem: Filesystem,
	turnDescriptor = turn([turnEnd()]),
) {
	const mock = createMockMiniACP({ defaultTurn: turnDescriptor });
	const module = buildStateExtensionModule([
		createCoreStateModule(mock.connector),
		createStoreStateModule(new StoreRegistry()),
		createEnvironmentModule(async () => createEnvironment(filesystem)),
		createReferencesModule(),
	]);
	return createRuntime(module, module.emptyState(), [
		editExtension(),
		filesystemFileReferenceExtension,
		imageDocumentReferenceExtension,
		textDocumentReferenceExtension,
		referenceReadExtension,
	]).then((runtime) => ({ runtime, mock }));
}

async function drain(iterable: AsyncIterable<unknown>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the mock prompt.
	}
}

type MockMiniACP = ReturnType<typeof createMockMiniACP>;

function firstToolResultText(mock: MockMiniACP): string {
	const content = mock.calls().toolResults[0]?.content[0];
	expect(content?.type).toBe('text');
	if (content?.type !== 'text') {
		throw new Error('Expected first tool result content to be text.');
	}
	return content.text;
}

describe('referenceReadExtension', () => {
	it('limits default filesystem text materialization and suggests the next range', async () => {
		const filesystem = new MemoryFilesystem();
		const lines = Array.from(
			{ length: 2002 },
			(_, index) => `line ${index + 1}`,
		);
		filesystem.seed('/project/large.md' as AbsolutePath, lines.join('\n'));
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: { path: '/project/large.md' },
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read note' }],
				}),
			);

			const text = firstToolResultText(mock);
			expect(text).toContain('Reference: /project/large.md');
			expect(text).toContain('line 1');
			expect(text).toContain('line 2000');
			expect(text).not.toContain('\nline 2001\n');
			expect(text).toContain('Continue with selector "lines=2001-2002"');
		} finally {
			await runtime.dispose();
		}
	});

	it('clamps oversized text selectors and suggests the continuation range', async () => {
		const filesystem = new MemoryFilesystem();
		const lines = Array.from(
			{ length: 2500 },
			(_, index) => `line ${index + 1}`,
		);
		filesystem.seed('/project/large.md' as AbsolutePath, lines.join('\n'));
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: {
							path: '/project/large.md',
							selector: 'lines=100-2300',
						},
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read note' }],
				}),
			);

			const text = firstToolResultText(mock);
			expect(text).toContain('Reference: /project/large.md');
			expect(text).toContain('line 100');
			expect(text).toContain('line 2099');
			expect(text).not.toContain('\nline 2100\n');
			expect(text).toContain('Continue with selector "lines=2100-2300"');
		} finally {
			await runtime.dispose();
		}
	});

	it('does not fall back to the whole text file for reversed line ranges', async () => {
		const filesystem = new MemoryFilesystem();
		const lines = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`);
		filesystem.seed('/project/large.md' as AbsolutePath, lines.join('\n'));
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: {
							path: '/project/large.md',
							selector: 'lines=12-10',
						},
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read note' }],
				}),
			);

			const text = firstToolResultText(mock);
			expect(text).toContain('Reference: /project/large.md');
			expect(text).toContain('No text lines selected');
			expect(text).toContain('Use lines=10-12');
			expect(text).not.toContain('line 1');
		} finally {
			await runtime.dispose();
		}
	});

	it('reads filesystem text through references and records the file as read', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.md' as AbsolutePath, 'alpha\nbeta\ngamma');
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: {
							path: '/project/note.md',
							selector: 'offset=2;limit=2',
						},
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read note' }],
				}),
			);

			expect(mock.calls().toolResults).toMatchObject([
				{
					content: [
						{
							type: 'text',
							text: 'Reference: /project/note.md\n\nbeta\ngamma',
						},
					],
				},
			]);
			expect(runtime.getStore(fileKey).get()).toHaveProperty(
				'/project/note.md',
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('advertises path and selector as the full reference-backed read_file schema', async () => {
		const filesystem = new MemoryFilesystem();
		const { runtime, mock } = await createReferenceReadRuntime(filesystem);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'sync tools' }],
				}),
			);

			const readFile = mock
				.context()
				.tools.find((tool) => tool.name === 'read_file');
			expect(readFile?.inputSchema).toMatchObject({
				type: 'object',
				properties: {
					path: { type: 'string' },
					selector: { type: 'string' },
				},
				required: ['path'],
			});
			expect(readFile?.inputSchema).not.toHaveProperty('properties.limit');
			expect(readFile?.inputSchema).not.toHaveProperty('properties.offset');
			expect(mock.context().systemPrompt).toContain(
				'Reading filesystem paths is supported.',
			);
			expect(mock.context().systemPrompt).toContain(
				'Reading text is supported.\nSupported selectors:\n- lines=N-M\n- offset=N;limit=N',
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('lets edit_file modify a file after reference-backed read_file reads it', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.md' as AbsolutePath, 'alpha\nbeta');
		const { runtime } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{ name: 'read_file', arguments: { path: '/project/note.md' } },
					{
						name: 'edit_file',
						arguments: {
							path: '/project/note.md',
							old_text: 'alpha',
							new_text: 'ALPHA',
						},
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'edit note' }],
				}),
			);

			const bytes = await filesystem.readFile(
				'/project/note.md' as AbsolutePath,
			);
			expect(decode(bytes)).toBe('ALPHA\nbeta');
		} finally {
			await runtime.dispose();
		}
	});

	it('lets text providers ignore non-text selector fields', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.md' as AbsolutePath, 'one\ntwo\nthree');
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: {
							path: '/project/note.md',
							selector: 'pages=1-2',
						},
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read note' }],
				}),
			);

			expect(mock.calls().toolResults).toMatchObject([
				{
					content: [
						{
							type: 'text',
							text: 'Reference: /project/note.md\n\none\ntwo\nthree',
						},
					],
				},
			]);
		} finally {
			await runtime.dispose();
		}
	});

	it('returns read failures as tool errors without authorizing edits', async () => {
		const filesystem = new MemoryFilesystem();
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: { path: '/project/missing.md' },
					},
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read missing' }],
				}),
			);

			expect(mock.calls().toolResults).toMatchObject([
				{
					isError: true,
					content: [
						{
							type: 'text',
							text: expect.stringContaining('Reference unavailable:'),
						},
					],
				},
			]);
			expect(runtime.getStore(fileKey).get()).toEqual({});
		} finally {
			await runtime.dispose();
		}
	});

	it('does not mark files as read during direct reference materialization', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.md' as AbsolutePath, 'alpha\nbeta');
		const { runtime } = await createReferenceReadRuntime(filesystem);

		try {
			await runtime.references.toContext({
				locator: '/project/note.md',
			});

			expect(runtime.getStore(fileKey).get()).toEqual({});
		} finally {
			await runtime.dispose();
		}
	});

	it('reads filesystem images through references', async () => {
		const filesystem = new MemoryFilesystem();
		const png = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52,
		]);
		await filesystem.writeFile('/project/image.png' as AbsolutePath, png);
		const { runtime, mock } = await createReferenceReadRuntime(
			filesystem,
			turn([
				toolCalls([
					{ name: 'read_file', arguments: { path: '/project/image.png' } },
				]),
				turnEnd(),
			]),
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'read image' }],
				}),
			);

			expect(mock.calls().toolResults).toMatchObject([
				{
					content: [
						{
							type: 'image',
							data: base64(png),
							mimeType: 'image/png',
						},
					],
				},
			]);
		} finally {
			await runtime.dispose();
		}
	});
});
