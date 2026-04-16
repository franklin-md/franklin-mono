import { describe, it, expect, vi } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { compileAll } from '../../../../algebra/compiler/compile.js';
import { combine } from '../../../../algebra/compiler/combine.js';
import { createCoreCompiler } from '../../../../systems/core/compile/compiler.js';
import { createEnvironmentCompiler } from '../../../../systems/environment/compile/compiler.js';
import { createStoreCompiler } from '../../../../systems/store/compile/compiler.js';
import {
	StoreRegistry,
	createEmptyStoreResult,
} from '../../../../systems/store/api/index.js';
import type { ReconfigurableEnvironment } from '../../../../systems/environment/api/types.js';
import { editExtension } from '../../edit/extension.js';
import { writeExtension } from '../extension.js';

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
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
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

function compileWriteAndEdit(env: ReconfigurableEnvironment) {
	const compiler = combine(
		combine(
			createCoreCompiler(),
			createStoreCompiler(createEmptyStoreResult(new StoreRegistry())),
		),
		createEnvironmentCompiler(env),
	);
	// editExtension owns the store; writeExtension uses it
	return compileAll(compiler, [editExtension(), writeExtension()]);
}

async function executeTool(
	result: Awaited<ReturnType<typeof compileWriteAndEdit>>,
	name: string,
	args: Record<string, unknown>,
) {
	return result.server.toolExecute(
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

function getResultText(result: {
	content: Array<{ type: string; text?: string }>;
}): string {
	return result.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('\n');
}

describe('writeExtension', () => {
	it('allows editing a file after writing it without a prior read', async () => {
		const env = mockEnvironment({});
		const result = await compileWriteAndEdit(env);

		// Write a new file
		await executeTool(result, 'write_file', {
			path: 'new.txt',
			content: 'hello world',
		});

		// Edit the file without calling read_file first
		const editResult = await executeTool(result, 'edit_file', {
			path: 'new.txt',
			old_text: 'hello',
			new_text: 'goodbye',
		});

		expect(editResult.isError).toBeUndefined();
		expect(getResultText(editResult)).toContain('new.txt');
		expect(env.filesystem.writeFile).toHaveBeenLastCalledWith(
			'new.txt',
			'goodbye world',
		);
	});

	it('allows consecutive writes followed by an edit', async () => {
		const env = mockEnvironment({});
		const result = await compileWriteAndEdit(env);

		// Write, then overwrite
		await executeTool(result, 'write_file', {
			path: 'file.txt',
			content: 'first version',
		});
		await executeTool(result, 'write_file', {
			path: 'file.txt',
			content: 'second version',
		});

		// Edit should work against the latest written content
		const editResult = await executeTool(result, 'edit_file', {
			path: 'file.txt',
			old_text: 'second',
			new_text: 'final',
		});

		expect(editResult.isError).toBeUndefined();
		expect(env.filesystem.writeFile).toHaveBeenLastCalledWith(
			'file.txt',
			'final version',
		);
	});
});
