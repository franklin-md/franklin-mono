import { describe, it, expect, vi } from 'vitest';
import { sha256Hex } from '../../hash.js';
import type { MiniACPClient } from '@franklin/mini-acp';
import { compile, combine } from '../../../../compile/types.js';
import { createCoreCompiler } from '../../../../compile/core/compiler.js';
import { createEnvironmentCompiler } from '../../../../compile/environment/compiler.js';
import { createStoreCompiler } from '../../../../compile/store/compiler.js';
import {
	StorePool,
	createEmptyStoreResult,
} from '../../../../api/store/index.js';
import type { Store } from '../../../../api/store/types.js';
import type { Environment } from '../../../../api/environment/types.js';
import { editExtension } from '../extension.js';

function mockEnvironment(
	files: Record<string, string> = {},
): Environment & { dispose(): Promise<void> } {
	const store = new Map<string, string>(Object.entries(files));
	return {
		filesystem: {
			readFile: vi.fn(async (path: string) => {
				const content = store.get(path);
				if (content === undefined) {
					throw new Error(`ENOENT: no such file: ${path}`);
				}
				return new TextEncoder().encode(content);
			}),
			writeFile: vi.fn(async (path: string, data: string | Uint8Array) => {
				const text =
					typeof data === 'string' ? data : new TextDecoder().decode(data);
				store.set(path, text);
			}),
			mkdir: vi.fn(async () => {}),
			access: vi.fn(async () => {}),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async (path: string) => store.has(path)),
			glob: vi.fn(async () => []),
			deleteFile: vi.fn(async () => {}),
			resolve: vi.fn(async (...paths: string[]) => paths[paths.length - 1]!),
		},
		config: vi.fn(async () => ({
			cwd: '/tmp',
			permissions: { allowRead: ['**'], allowWrite: ['**'] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function compileEdit(env: Environment & { dispose(): Promise<void> }) {
	const compiler = combine(
		combine(
			createCoreCompiler(),
			createStoreCompiler(createEmptyStoreResult(new StorePool())),
		),
		createEnvironmentCompiler(env),
	);
	return compile(compiler, editExtension());
}

async function executeTool(
	result: Awaited<ReturnType<typeof compileEdit>>,
	args: Record<string, unknown>,
) {
	return result.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'c1',
				name: 'edit_file',
				arguments: args,
			},
		},
		vi.fn(),
	);
}

function simulateRead(
	result: Awaited<ReturnType<typeof compileEdit>>,
	path: string,
	content: string,
) {
	const bytes = new TextEncoder().encode(content);
	const fileHash = sha256Hex(bytes);
	const storeEntry = result.stores.get('last_read');
	(storeEntry!.store as Store<Record<string, string>>).set((draft) => {
		draft[path] = fileHash;
	});
}

function getResultText(result: {
	content: Array<{ type: string; text?: string }>;
}): string {
	return result.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('\n');
}

describe('editExtension', () => {
	it('registers the edit_file tool', async () => {
		const env = mockEnvironment();
		const result = await compileEdit(env);

		const received: Array<Parameters<MiniACPClient['setContext']>[0]> = [];
		const target: MiniACPClient = {
			initialize: vi.fn(async () => ({})),
			setContext: vi.fn(
				async (params: Parameters<MiniACPClient['setContext']>[0]) => {
					received.push(params);
					return {};
				},
			),
			prompt: vi.fn(async function* () {
				yield* [];
			}),
			cancel: vi.fn(async () => {}),
		};

		const { apply } = await import('../../../../api/core/middleware/apply.js');

		const wrapped = apply(result.client, target);
		await wrapped.setContext({ ctx: {} });

		const ctx = received[0] as {
			ctx: { tools: { name: string }[] };
		};
		expect(ctx.ctx.tools).toHaveLength(1);
		expect(ctx.ctx.tools[0]!.name).toBe('edit_file');
	});

	it('performs a successful edit', async () => {
		const env = mockEnvironment({
			'test.txt': 'hello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'hello world');
		const toolResult = await executeTool(result, {
			path: 'test.txt',
			old_text: 'world',
			new_text: 'there',
		});

		expect(toolResult.isError).toBeUndefined();
		const text = getResultText(toolResult);
		expect(text).toContain('test.txt');

		// Verify the file was written with the replacement
		expect(env.filesystem.writeFile).toHaveBeenCalledWith(
			'test.txt',
			'hello there',
		);
	});

	it('throws when old_text is not found', async () => {
		const env = mockEnvironment({
			'test.txt': 'hello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'hello world');

		await expect(
			executeTool(result, {
				path: 'test.txt',
				old_text: 'missing text',
				new_text: 'replacement',
			}),
		).rejects.toThrow('Could not find');
	});

	it('throws when old_text matches multiple times', async () => {
		const env = mockEnvironment({
			'test.txt': 'ab ab ab',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'ab ab ab');

		await expect(
			executeTool(result, {
				path: 'test.txt',
				old_text: 'ab',
				new_text: 'cd',
			}),
		).rejects.toThrow('unique');
	});

	it('throws when file does not exist', async () => {
		const env = mockEnvironment({});
		const result = await compileEdit(env);

		await expect(
			executeTool(result, {
				path: 'missing.txt',
				old_text: 'x',
				new_text: 'y',
			}),
		).rejects.toThrow('File not found');
	});

	it('preserves BOM on write', async () => {
		const env = mockEnvironment({
			'bom.txt': '\uFEFFhello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'bom.txt', '\uFEFFhello world');
		await executeTool(result, {
			path: 'bom.txt',
			old_text: 'world',
			new_text: 'there',
		});

		expect(env.filesystem.writeFile).toHaveBeenCalledWith(
			'bom.txt',
			'\uFEFFhello there',
		);
	});

	it('preserves CRLF line endings on write', async () => {
		const env = mockEnvironment({
			'crlf.txt': 'line1\r\nline2\r\nline3',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'crlf.txt', 'line1\r\nline2\r\nline3');
		await executeTool(result, {
			path: 'crlf.txt',
			old_text: 'line2',
			new_text: 'replaced',
		});

		expect(env.filesystem.writeFile).toHaveBeenCalledWith(
			'crlf.txt',
			'line1\r\nreplaced\r\nline3',
		);
	});

	it('handles fuzzy matching on smart quotes', async () => {
		const env = mockEnvironment({
			'quotes.txt': 'it\u2019s a test',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'quotes.txt', 'it\u2019s a test');
		const toolResult = await executeTool(result, {
			path: 'quotes.txt',
			old_text: "it's a test",
			new_text: 'replaced',
		});

		expect(toolResult.isError).toBeUndefined();
		expect(env.filesystem.writeFile).toHaveBeenCalled();
	});

	it('throws when replacement produces identical content', async () => {
		const env = mockEnvironment({
			'same.txt': 'hello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'same.txt', 'hello world');

		await expect(
			executeTool(result, {
				path: 'same.txt',
				old_text: 'hello',
				new_text: 'hello',
			}),
		).rejects.toThrow('No changes');
	});
});
