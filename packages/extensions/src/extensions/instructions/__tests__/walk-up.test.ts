import { describe, it, expect } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { walkUp } from '../discovery/walk-up.js';

describe('walkUp', () => {
	it('walks up to endDir inclusive', async () => {
		const visited: string[] = [];
		await walkUp({
			startDir: '/a/b/c' as AbsolutePath,
			endDir: '/a' as AbsolutePath,
			discover: async (dir) => {
				visited.push(dir);
				return [];
			},
		});
		expect(visited).toEqual(['/a/b/c', '/a/b', '/a']);
	});

	it('walks to the filesystem root when endDir is omitted', async () => {
		const visited: string[] = [];
		await walkUp({
			startDir: '/a/b' as AbsolutePath,
			discover: async (dir) => {
				visited.push(dir);
				return [];
			},
		});
		expect(visited).toEqual(['/a/b', '/a', '/']);
	});

	it('collects all results into a flat array in walk order', async () => {
		const results = await walkUp({
			startDir: '/a/b' as AbsolutePath,
			endDir: '/a' as AbsolutePath,
			discover: async (dir) => [`item:${dir}`],
		});
		expect(results).toEqual(['item:/a/b', 'item:/a']);
	});

	it('stops at filesystem root when endDir is unreachable', async () => {
		const visited: string[] = [];
		await walkUp({
			startDir: '/x' as AbsolutePath,
			endDir: '/does/not/exist' as AbsolutePath,
			discover: async (dir) => {
				visited.push(dir);
				return [];
			},
		});
		expect(visited).toEqual(['/x', '/']);
	});

	it('returns empty array when discover always returns empty', async () => {
		const results = await walkUp({
			startDir: '/a/b' as AbsolutePath,
			endDir: '/a' as AbsolutePath,
			discover: async () => [],
		});
		expect(results).toEqual([]);
	});
});
