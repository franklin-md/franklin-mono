import { describe, expect, it, vi } from 'vitest';
import {
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { compileCoreWithEnv } from '../../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import { globExtension } from '../extension.js';

function mockEnvironment(results: string[]): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async () => true),
			glob: vi.fn(
				async (
					_pattern: string | string[],
					options: Parameters<Filesystem['glob']>[1],
				) =>
					options.limit === undefined
						? results
						: results.slice(0, options.limit),
			),
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

type Compiled = Awaited<ReturnType<typeof compileGlob>>;

function compileGlob(env: ReconfigurableEnvironment) {
	return compileCoreWithEnv(globExtension(), env);
}

async function executeTool(compiled: Compiled, args: Record<string, unknown>) {
	return compiled.middleware.server.toolExecute(
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

function getResultText(result: {
	content: Array<{ type: string; text?: string }>;
}): string {
	return result.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('\n');
}

describe('globExtension', () => {
	it('does not report limited output when the result limit was not hit', async () => {
		const env = mockEnvironment(['note.md']);
		const compiled = await compileGlob(env);

		const result = await executeTool(compiled, {
			pattern: '*.md',
			options: { limit: 50 },
		});

		expect(getResultText(result)).toBe('note.md');
	});

	it('does not report limited output when the result count equals the limit', async () => {
		const env = mockEnvironment(['one.md', 'two.md']);
		const compiled = await compileGlob(env);

		const result = await executeTool(compiled, {
			pattern: '*.md',
			options: { limit: 2 },
		});

		expect(getResultText(result)).toBe('one.md\ntwo.md');
	});

	it('reports limited output only when an extra result exists', async () => {
		const env = mockEnvironment(['one.md', 'two.md', 'three.md']);
		const compiled = await compileGlob(env);

		const result = await executeTool(compiled, {
			pattern: '*.md',
			options: { limit: 2 },
		});

		expect(getResultText(result)).toBe(
			'one.md\ntwo.md\n[OUTPUT IS LIMITED TO FIRST 2 RESULTS]',
		);
	});
});
