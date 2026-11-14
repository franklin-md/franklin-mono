import { describe, it, expect, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	type JsonObject,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { sha256Hex } from '../../hash.js';
import { compileCoreWithStoreAndEnv } from '../../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { fileKey } from '../../common/key.js';
import { editExtension } from '../extension.js';
import { readExtension } from '../../read/extension.js';

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
			resolve: vi.fn(
				async (...paths: string[]) => paths[paths.length - 1]! as AbsolutePath,
			),
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

function compileEdit(env: ReconfigurableEnvironment) {
	return compileCoreWithStoreAndEnv(editExtension(), env);
}

function compileReadAndEdit(env: ReconfigurableEnvironment) {
	return compileCoreWithStoreAndEnv((api) => {
		editExtension()(api);
		readExtension()(api);
	}, env);
}

type Compiled = Awaited<ReturnType<typeof compileEdit>>;

async function executeTool(
	compiled: Compiled,
	args: JsonObject,
	name = 'edit_file',
) {
	return compiled.middleware.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'c1',
				name,
				arguments: args,
			},
		},
		vi.fn(),
	);
}

function simulateRead(compiled: Compiled, path: string, content: string) {
	const bytes = new TextEncoder().encode(content);
	const fileHash = sha256Hex(bytes);
	const store = compiled.ctx.getStore(fileKey);
	store.set((draft) => {
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
	it.each<[string, string, string, string, string | RegExp, boolean?]>([
		[
			'preserves unrelated typing at the same target line numbers',
			'above\ntarget\nbelow',
			'user above\ntarget\nuser below',
			'target',
			'user above\nreplacement\nuser below',
		],
		[
			'preserves added lines below the target',
			'above\ntarget\nbelow',
			'above\ntarget\nadded\nbelow',
			'target',
			'above\nreplacement\nadded\nbelow',
		],
		[
			'uses the saved target when another occurrence appears elsewhere',
			'above\ntarget\nbelow',
			'above\ntarget\ntarget',
			'target',
			'above\nreplacement\ntarget',
		],
		[
			'handles multiline matches and earlier line-length changes',
			'a\npre target\nnext tail\nz',
			'longer a\npre target\nnext tail\nuser z',
			'target\nnext',
			'longer a\npre replacement tail\nuser z',
		],
		[
			'excludes the next line when a match ends at a newline',
			'a\ntarget\nb',
			'longer a\ntarget\nuser b',
			'target\n',
			'longer a\nreplacementuser b',
		],
		[
			'includes the previous line when a match starts at its newline',
			'a\npre\ntarget\nb',
			'longer a\npre\ntarget\nuser b',
			'\ntarget',
			'longer a\nprereplacement\nuser b',
		],
		[
			'preserves BOM and CRLF after unrelated typing',
			'\uFEFFa\r\ntarget\r\nb',
			'\uFEFFlonger a\r\ntarget\r\nuser b',
			'target\r\n',
			'\uFEFFlonger a\r\nreplacementuser b',
		],
		[
			'preserves unrelated mixed line endings in the current document',
			'a\r\ntarget\r\nb',
			'a\r\ntarget\r\nuser\nb',
			'target',
			'a\r\nreplacement\r\nuser\nb',
		],
		[
			'counts empty lines above the target',
			'a\n\ntarget\nb',
			'longer a\n\ntarget\nuser b',
			'target',
			'longer a\n\nreplacement\nuser b',
		],
		[
			'guards the whole target line when old_text still matches',
			'a\npre target tail\nb',
			'a\npre target USER\nb',
			'target',
			/Reread/,
		],
		[
			'rejects changed target text',
			'a\ntarget\nb',
			'a\nuser target\nb',
			'target',
			/Reread/,
		],
		[
			'guards the full last line of a multiline match',
			'a\npre target\nnext tail\nz',
			'a\npre target\nnext USER\nz',
			'target\nnext',
			/Reread/,
		],
		[
			'rejects inserted lines above instead of remapping',
			'a\ntarget\nb',
			'added\na\ntarget\nb',
			'target',
			/Reread/,
		],
		[
			'rejects deleted lines above instead of remapping',
			'a\ntarget\nb',
			'target\nb',
			'target',
			/Reread/,
		],
		[
			'rejects a lookalike elsewhere after target deletion',
			'a\ntarget\nb',
			'a\nremoved\ntarget',
			'target',
			/Reread/,
		],
		[
			'requires old_text to be unique in the snapshot',
			'target\ntarget\nb',
			'changed\ntarget\nb',
			'target',
			/unique/,
		],
		[
			'requires old_text to exist in the snapshot',
			'a\noriginal\nb',
			'a\ntarget\nb',
			'target',
			/Could not find/,
		],
		[
			'rejects stale fuzzy edits',
			'a\nit\u2019s here\nb',
			'user a\nit\u2019s here\nb',
			"it's here",
			/Reread/,
		],
		[
			'rejects stale replace_all',
			'a\ntarget\nb',
			'user a\ntarget\nb',
			'target',
			/Reread/,
			true,
		],
		[
			'keeps unsupported reads hash-only',
			'%PDF-1.7\ntarget\nb',
			'%PDF-1.7\ntarget\nuser b',
			'target',
			/without a text snapshot/,
		],
		[
			'keeps NUL-containing reads hash-only',
			'a\0\ntarget\nb',
			'a\0\ntarget\nuser b',
			'target',
			/without a text snapshot/,
		],
		[
			'guards an unterminated target line',
			'a\ntarget',
			'a\ntarget user',
			'target',
			/Reread/,
		],
	])(
		'%s',
		async (_name, snapshot, current, old_text, expected, replace_all) => {
			const env = mockEnvironment({ 'test.txt': snapshot });
			const compiled = await compileReadAndEdit(env);
			await executeTool(compiled, { path: 'test.txt' }, 'read_file');
			await env.filesystem.writeFile('test.txt' as AbsolutePath, current);
			vi.mocked(env.filesystem.writeFile).mockClear();

			const result = await executeTool(compiled, {
				path: 'test.txt',
				old_text,
				new_text: 'replacement',
				...(replace_all ? { replace_all } : {}),
			});

			expect(result.isError).toBe(
				typeof expected === 'string' ? undefined : true,
			);
			expect(getResultText(result)).toMatch(
				typeof expected === 'string' ? /Successfully edited/ : expected,
			);
			expect(env.filesystem.writeFile).toHaveBeenCalledTimes(
				typeof expected === 'string' ? 1 : 0,
			);
			expect(
				new TextDecoder('utf-8', { ignoreBOM: true }).decode(
					await env.filesystem.readFile('test.txt' as AbsolutePath),
				),
			).toBe(typeof expected === 'string' ? expected : current);
		},
	);

	it('refreshes the snapshot after each edit, including its new line numbers', async () => {
		const env = mockEnvironment({ 'test.txt': 'above\ntarget\nbelow' });
		const compiled = await compileReadAndEdit(env);
		const read = await executeTool(
			compiled,
			{ path: 'test.txt', offset: 2, limit: 1 },
			'read_file',
		);
		expect(getResultText(read)).toBe('target');
		await env.filesystem.writeFile(
			'test.txt' as AbsolutePath,
			'user above\ntarget\nbelow',
		);
		const first = await executeTool(compiled, {
			path: 'test.txt',
			old_text: 'target',
			new_text: 'first\nsecond',
		});
		expect(first.isError).toBeUndefined();
		await env.filesystem.writeFile(
			'test.txt' as AbsolutePath,
			'user above\nfirst\nsecond\nuser below',
		);
		const second = await executeTool(compiled, {
			path: 'test.txt',
			old_text: 'second',
			new_text: 'final',
		});
		expect(second.isError).toBeUndefined();
		expect(
			new TextDecoder().decode(
				await env.filesystem.readFile('test.txt' as AbsolutePath),
			),
		).toBe('user above\nfirst\nfinal\nuser below');
	});

	it.each([false, true])(
		'requires a reread with a changed hash-only record: %s',
		async (legacy) => {
			const env = mockEnvironment({ 'test.txt': 'user above\ntarget' });
			const compiled = await compileEdit(env);
			if (legacy) simulateRead(compiled, 'test.txt', 'above\ntarget');
			const result = await executeTool(compiled, {
				path: 'test.txt',
				old_text: 'target',
				new_text: 'replacement',
			});
			expect(result.isError).toBe(true);
			expect(getResultText(result)).toMatch(legacy ? /Reread/ : /never read/);
			expect(env.filesystem.writeFile).not.toHaveBeenCalled();
		},
	);

	it('registers the edit_file tool', async () => {
		const env = mockEnvironment();
		const compiled = await compileEdit(env);

		expect(compiled.tools).toHaveLength(1);
		expect(compiled.tools[0]!.name).toBe('edit_file');
	});

	it('accepts an unchanged hash-only record from an older session', async () => {
		const env = mockEnvironment({
			'test.txt': 'hello world',
		});
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'test.txt', 'hello world');
		const toolResult = await executeTool(compiled, {
			path: 'test.txt',
			old_text: 'world',
			new_text: 'there',
		});

		expect(toolResult.isError).toBeUndefined();
		const text = getResultText(toolResult);
		expect(text).toContain('test.txt');

		expect(env.filesystem.writeFile).toHaveBeenCalledWith(
			'test.txt',
			'hello there',
		);
	});

	it('returns isError when old_text is not found', async () => {
		const env = mockEnvironment({
			'test.txt': 'hello world',
		});
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'test.txt', 'hello world');

		const toolResult = await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'test.txt', 'ab ab ab');

		const toolResult = await executeTool(compiled, {
			path: 'test.txt',
			old_text: 'ab',
			new_text: 'cd',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('unique');
	});

	it('returns isError when file does not exist', async () => {
		const env = mockEnvironment({});
		const compiled = await compileEdit(env);

		const toolResult = await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'bom.txt', '\uFEFFhello world');
		await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'crlf.txt', 'line1\r\nline2\r\nline3');
		await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'quotes.txt', 'it\u2019s a test');
		const toolResult = await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'test.txt', 'aaa bbb ccc');

		const first = await executeTool(compiled, {
			path: 'test.txt',
			old_text: 'aaa',
			new_text: 'xxx',
		});
		expect(first.isError).toBeUndefined();

		const second = await executeTool(compiled, {
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
		const compiled = await compileEdit(env);
		simulateRead(compiled, 'same.txt', 'hello world');

		const toolResult = await executeTool(compiled, {
			path: 'same.txt',
			old_text: 'hello',
			new_text: 'hello',
		});
		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('No changes');
	});
});
