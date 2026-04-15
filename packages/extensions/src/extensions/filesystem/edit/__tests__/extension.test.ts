import { describe, it, expect, vi } from 'vitest';
import { sha256Hex } from '../../hash.js';
import type { MiniACPClient } from '@franklin/mini-acp';
import { compile, combine } from '../../../../compile/types.js';
import { createCoreCompiler } from '../../../../compile/core/compiler.js';
import { createEnvironmentCompiler } from '../../../../compile/environment/compiler.js';
import { createStoreCompiler } from '../../../../compile/store/compiler.js';
import {
	StoreRegistry,
	createEmptyStoreResult,
} from '../../../../api/store/index.js';
import type { Store } from '../../../../api/store/types.js';
import type { ReconfigurableEnvironment } from '../../../../api/environment/types.js';
import { editExtension } from '../extension.js';

function mockEnvironment(
	files: Record<string, string> = {},
): ReconfigurableEnvironment {
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
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp',
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['**'],
					denyWrite: [],
				},
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function compileEdit(env: ReconfigurableEnvironment) {
	const compiler = combine(
		combine(
			createCoreCompiler(),
			createStoreCompiler(createEmptyStoreResult(new StoreRegistry())),
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
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(
				async (params: Parameters<MiniACPClient['setContext']>[0]) => {
					received.push(params);
				},
			),
			prompt: vi.fn(async function* () {
				yield* [];
			}),
			cancel: vi.fn(async () => {}),
		};

		const { apply } = await import('../../../../api/core/middleware/apply.js');

		const wrapped = apply(result.client, target);
		await wrapped.setContext({});

		const ctx = received[0] as { tools: { name: string }[] };
		expect(ctx.tools).toHaveLength(1);
		expect(ctx.tools[0]!.name).toBe('edit_file');
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

	it('returns isError when old_text is not found', async () => {
		const env = mockEnvironment({
			'test.txt': 'hello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'hello world');

		const toolResult = await executeTool(result, {
			path: 'test.txt',
			old_text: 'missing text',
			new_text: 'replacement',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('Could not find');
	});

	it('returns isError when old_text matches multiple times', async () => {
		const env = mockEnvironment({
			'test.txt': 'ab ab ab',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'ab ab ab');

		const toolResult = await executeTool(result, {
			path: 'test.txt',
			old_text: 'ab',
			new_text: 'cd',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('unique');
	});

	it('returns isError when file does not exist', async () => {
		const env = mockEnvironment({});
		const result = await compileEdit(env);

		const toolResult = await executeTool(result, {
			path: 'missing.txt',
			old_text: 'x',
			new_text: 'y',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('File not found');
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

	it('allows consecutive edits without re-reading the file', async () => {
		const env = mockEnvironment({
			'test.txt': 'aaa bbb ccc',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'test.txt', 'aaa bbb ccc');

		// First edit
		const first = await executeTool(result, {
			path: 'test.txt',
			old_text: 'aaa',
			new_text: 'xxx',
		});
		expect(first.isError).toBeUndefined();

		// Second edit — should succeed without a re-read
		const second = await executeTool(result, {
			path: 'test.txt',
			old_text: 'bbb',
			new_text: 'yyy',
		});
		expect(second.isError).toBeUndefined();
		expect(env.filesystem.writeFile).toHaveBeenLastCalledWith(
			'test.txt',
			'xxx yyy ccc',
		);
	});

	it('returns isError when replacement produces identical content', async () => {
		const env = mockEnvironment({
			'same.txt': 'hello world',
		});
		const result = await compileEdit(env);
		simulateRead(result, 'same.txt', 'hello world');

		const toolResult = await executeTool(result, {
			path: 'same.txt',
			old_text: 'hello',
			new_text: 'hello',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('No changes');
	});
});
