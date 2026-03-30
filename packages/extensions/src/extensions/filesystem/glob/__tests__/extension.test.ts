import { describe, it, expect, vi } from 'vitest';
import { compile, combine } from '../../../../compile/types.js';
import { createCoreCompiler } from '../../../../compile/core/compiler.js';
import { createEnvironmentCompiler } from '../../../../compile/environment/compiler.js';
import type { Environment } from '../../../../api/environment/types.js';
import type { Filesystem } from '@franklin/lib';
import { createFolderScopedFilesystem } from '@franklin/lib';
import { globExtension } from '../extension.js';

function mockFilesystem(
	files: Record<string, string[]> = {},
): Filesystem {
	return {
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		access: vi.fn(),
		stat: vi.fn(),
		readdir: vi.fn(),
		exists: vi.fn(),
		glob: vi.fn(
			async (
				pattern: string | string[],
				options: { root_dir?: string; ignore?: string[]; limit?: number },
			) => {
				const key = `${options.root_dir ?? '.'}:${Array.isArray(pattern) ? pattern.join(',') : pattern}`;
				let results = files[key] ?? [];
				if (options.limit !== undefined) {
					results = results.slice(0, options.limit);
				}
				return results;
			},
		),
		deleteFile: vi.fn(),
	};
}

function compileGlob(env: Environment) {
	const compiler = combine(
		createCoreCompiler(),
		createEnvironmentCompiler(env),
	);
	return compile(compiler, globExtension());
}

async function executeTool(
	result: Awaited<ReturnType<typeof compileGlob>>,
	args: Record<string, unknown>,
) {
	return result.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'c1',
				name: 'glob',
				arguments: args,
			},
		},
		vi.fn(),
	);
}

describe('globExtension', () => {
	it('registers the glob tool', async () => {
		const fs = mockFilesystem();
		const result = await compileGlob({ filesystem: fs });

		const received: unknown[] = [];
		const target = {
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async (params: unknown) => {
				received.push(params);
			}),
			prompt: vi.fn(async function* () {}),
			cancel: vi.fn(async () => ({
				type: 'turn_end' as const,
				turn: 'end',
			})),
		};

		const { apply } = await import(
			'../../../../api/core/middleware/apply.js'
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		const wrapped = apply(result.client, target as any);
		await wrapped.setContext({ ctx: {} });

		const ctx = received[0] as {
			ctx: { tools: { name: string }[] };
		};
		expect(ctx.ctx.tools).toHaveLength(1);
		expect(ctx.ctx.tools[0]!.name).toBe('glob');
	});

	it('calls filesystem.glob with the right options', async () => {
		const fs = mockFilesystem({
			'.:*.ts': ['index.ts', 'utils.ts'],
		});
		const result = await compileGlob({ filesystem: fs });

		const toolResult = await executeTool(result, {
			pattern: '*.ts',
			options: {},
		});

		expect(fs.glob).toHaveBeenCalledWith('*.ts', {
			root_dir: undefined,
			ignore: undefined,
			limit: undefined,
		});
		expect(toolResult.content).toContainEqual(
			expect.objectContaining({
				text: expect.stringContaining('index.ts'),
			}),
		);
	});

	it('maps exclude to ignore', async () => {
		const fs = mockFilesystem({
			'.:*.ts': ['index.ts'],
		});
		const result = await compileGlob({ filesystem: fs });

		await executeTool(result, {
			pattern: '*.ts',
			options: { exclude: ['*.test.ts'] },
		});

		expect(fs.glob).toHaveBeenCalledWith('*.ts', {
			root_dir: undefined,
			ignore: ['*.test.ts'],
			limit: undefined,
		});
	});

	it('passes root_dir and limit through', async () => {
		const fs = mockFilesystem({
			'/src:*.ts': ['a.ts', 'b.ts'],
		});
		const result = await compileGlob({ filesystem: fs });

		await executeTool(result, {
			pattern: '*.ts',
			options: { root_dir: '/src', limit: 1 },
		});

		expect(fs.glob).toHaveBeenCalledWith('*.ts', {
			root_dir: '/src',
			ignore: undefined,
			limit: 1,
		});
	});

	it('passes array patterns through to filesystem', async () => {
		const fs = mockFilesystem({
			'.:*.ts,*.js': ['a.ts', 'b.js'],
		});
		const result = await compileGlob({ filesystem: fs });

		await executeTool(result, {
			pattern: ['*.ts', '*.js'],
			options: {},
		});

		expect(fs.glob).toHaveBeenCalledWith(['*.ts', '*.js'], {
			root_dir: undefined,
			ignore: undefined,
			limit: undefined,
		});
	});

	describe('with FolderScopedFilesystem', () => {
		it('resolves root_dir relative to cwd', async () => {
			const inner = mockFilesystem({
				'/project/src:*.ts': ['component.ts'],
			});
			const scoped = createFolderScopedFilesystem('/project', inner);
			const result = await compileGlob({ filesystem: scoped });

			await executeTool(result, {
				pattern: '*.ts',
				options: { root_dir: 'src' },
			});

			expect(inner.glob).toHaveBeenCalledWith('*.ts', {
				root_dir: '/project/src',
				ignore: undefined,
				limit: undefined,
			});
		});

		it('defaults root_dir to cwd when not specified', async () => {
			const inner = mockFilesystem({
				'/project:*.ts': ['index.ts'],
			});
			const scoped = createFolderScopedFilesystem('/project', inner);
			const result = await compileGlob({ filesystem: scoped });

			await executeTool(result, {
				pattern: '*.ts',
				options: {},
			});

			expect(inner.glob).toHaveBeenCalledWith('*.ts', {
				root_dir: '/project',
				ignore: undefined,
				limit: undefined,
			});
		});

		it('preserves ignore and limit through scoped filesystem', async () => {
			const inner = mockFilesystem({
				'/project:*.ts': ['a.ts'],
			});
			const scoped = createFolderScopedFilesystem('/project', inner);
			const result = await compileGlob({ filesystem: scoped });

			await executeTool(result, {
				pattern: '*.ts',
				options: { exclude: ['node_modules/**'], limit: 5 },
			});

			expect(inner.glob).toHaveBeenCalledWith('*.ts', {
				root_dir: '/project',
				ignore: ['node_modules/**'],
				limit: 5,
			});
		});
	});
});
