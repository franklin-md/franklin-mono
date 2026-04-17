import { describe, expect, it } from 'vitest';
import type { AbsolutePath, Filesystem } from '@franklin/lib';

import { createClaudeSpec } from '../specs/claude.js';

function makeFs(
	files: Record<string, string>,
	options: { existsErrors?: Record<string, Error> } = {},
): Filesystem {
	const encoder = new TextEncoder();
	return {
		exists: async (p) => {
			const error = options.existsErrors?.[p];
			if (error) throw error;
			return Object.prototype.hasOwnProperty.call(files, p);
		},
		readFile: async (p) => {
			if (!(p in files)) throw new Error(`ENOENT: ${p}`);
			return encoder.encode(files[p]);
		},
		writeFile: async () => {},
		mkdir: async () => {},
		access: async () => {},
		stat: async () => ({ isFile: true, isDirectory: false }),
		readdir: async () => [],
		glob: async () => [],
		deleteFile: async () => {},
		resolve: async (...paths) => paths[paths.length - 1]! as AbsolutePath,
	};
}

describe('createClaudeSpec', () => {
	it('names itself "claude.md"', () => {
		expect(createClaudeSpec().name).toBe('claude.md');
	});

	it('discovers CLAUDE.md walking up from cwd', async () => {
		const spec = createClaudeSpec({ endDir: '/Users/afv' as AbsolutePath });
		const fs = makeFs({
			'/Users/afv/project/CLAUDE.md': 'project-level',
			'/Users/afv/CLAUDE.md': 'home-level',
		});
		const files = await spec.collect(fs, '/Users/afv/project' as AbsolutePath);
		expect(files).toEqual([
			'/Users/afv/project/CLAUDE.md',
			'/Users/afv/CLAUDE.md',
		]);
	});

	it('orders CLAUDE.md before CLAUDE.local.md at the same level', async () => {
		const spec = createClaudeSpec({ endDir: '/p' as AbsolutePath });
		const fs = makeFs({
			'/p/CLAUDE.local.md': 'local',
			'/p/CLAUDE.md': 'main',
		});
		const files = await spec.collect(fs, '/p' as AbsolutePath);
		expect(files).toEqual(['/p/CLAUDE.md', '/p/CLAUDE.local.md']);
	});

	it('picks up .claude/CLAUDE.md at a walked level', async () => {
		const spec = createClaudeSpec({ endDir: '/Users/afv' as AbsolutePath });
		const fs = makeFs({
			'/Users/afv/.claude/CLAUDE.md': 'global-via-walk',
		});
		const files = await spec.collect(fs, '/Users/afv/project' as AbsolutePath);
		expect(files).toEqual(['/Users/afv/.claude/CLAUDE.md']);
	});

	it('emits all three probe variants in order at the same level', async () => {
		const spec = createClaudeSpec({ endDir: '/p' as AbsolutePath });
		const fs = makeFs({
			'/p/CLAUDE.md': 'a',
			'/p/CLAUDE.local.md': 'b',
			'/p/.claude/CLAUDE.md': 'c',
		});
		const files = await spec.collect(fs, '/p' as AbsolutePath);
		expect(files).toEqual([
			'/p/CLAUDE.md',
			'/p/CLAUDE.local.md',
			'/p/.claude/CLAUDE.md',
		]);
	});

	it('tags files with spec="claude.md" and scope="project"', async () => {
		const spec = createClaudeSpec({ endDir: '/p' as AbsolutePath });
		const fs = makeFs({ '/p/CLAUDE.md': 'x' });
		const [file] = await spec.collect(fs, '/p' as AbsolutePath);
		expect(file).toBeDefined();
	});

	it('returns empty when no probes match', async () => {
		const spec = createClaudeSpec({ endDir: '/p' as AbsolutePath });
		const files = await spec.collect(makeFs({}), '/p' as AbsolutePath);
		expect(files).toEqual([]);
	});

	it('stops at endDir inclusive', async () => {
		const spec = createClaudeSpec({ endDir: '/a/b' as AbsolutePath });
		const fs = makeFs({
			'/a/b/c/CLAUDE.md': 'leaf',
			'/a/b/CLAUDE.md': 'mid',
			'/a/CLAUDE.md': 'above-boundary',
		});
		const files = await spec.collect(fs, '/a/b/c' as AbsolutePath);
		expect(files).toEqual(['/a/b/c/CLAUDE.md', '/a/b/CLAUDE.md']);
	});

	it('walks to filesystem root when endDir omitted', async () => {
		const spec = createClaudeSpec();
		const fs = makeFs({
			'/p/CLAUDE.md': 'x',
			'/CLAUDE.md': 'root',
		});
		const files = await spec.collect(fs, '/p' as AbsolutePath);
		expect(files).toEqual(['/p/CLAUDE.md', '/CLAUDE.md']);
	});

	it('skips unreadable ancestor probes instead of failing discovery', async () => {
		const spec = createClaudeSpec();
		const fs = makeFs(
			{
				'/project/CLAUDE.md': 'project-level',
			},
			{
				existsErrors: {
					'/CLAUDE.md': new Error('Read access denied: /CLAUDE.md'),
				},
			},
		);

		const files = await spec.collect(fs, '/project' as AbsolutePath);
		expect(files).toEqual(['/project/CLAUDE.md']);
	});
});
