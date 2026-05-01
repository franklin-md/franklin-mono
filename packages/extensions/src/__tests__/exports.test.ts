import { describe, expect, it, vi } from 'vitest';
import { compileAll } from '../index.js';
import type { Compiler } from '../algebra/compiler/types.js';
import type { Extension } from '../algebra/types/extension.js';

describe('package exports', () => {
	it('re-exports compileAll from the root barrel', async () => {
		const calls: string[] = [];
		const compiler: Compiler<{ register(label: string): void }, string> = {
			api: {
				register(label: string) {
					calls.push(label);
				},
			},
			build: vi.fn(async () => 'built'),
		};
		const extensions: Extension<{ register(label: string): void }>[] = [
			(api) => api.register('one'),
			(api) => api.register('two'),
		];

		await expect(compileAll(compiler, extensions)).resolves.toBe('built');
		expect(calls).toEqual(['one', 'two']);
		expect(compiler.build).toHaveBeenCalledOnce();
	});
});
