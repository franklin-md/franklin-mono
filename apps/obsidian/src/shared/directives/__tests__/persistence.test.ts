import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeFilesystem } from '@franklin/node';
import { toAbsolutePath } from '@franklin/lib';
import { describe, expect, it } from 'vitest';
import { createDirectivePersistence } from '../storage/persistence.js';
import { createDirectiveTestRegistry } from '../testing/registry.js';

describe('directive disk persistence', () => {
	it('atomically saves and restores instance states without leaving temporary files', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'franklin-directives-'));
		try {
			const path = toAbsolutePath(join(directory, 'directives.json'));
			const persistence = createDirectivePersistence({
				filesystem: createNodeFilesystem(),
				path,
			});
			const registry = await createDirectiveTestRegistry(
				undefined,
				persistence,
			);
			const instance = await registry
				.registerDirective<{ count: number }>('counter', () => null)
				.create({ count: 1 });
			const write = instance.update((state) => {
				state.count = 2;
			});
			await registry.dispose();
			await write;
			const restored = await createDirectiveTestRegistry(
				undefined,
				persistence,
			);
			expect(
				restored
					.registerDirective<{ count: number }>('counter', () => null)
					.get(instance.id)
					?.state.get(),
			).toEqual({ count: 2 });
			expect(await readdir(directory)).toEqual(['directives.json']);
			expect(await readFile(path, 'utf8')).toContain(instance.id);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
