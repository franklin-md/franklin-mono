import { describe, expect, it, vi } from 'vitest';
import type { BaseRuntime } from '../types.js';
import { combineRuntimes } from '../combine.js';
import { identityRuntime } from '../../modules/simple/identity.js';

type TaggedRuntime = BaseRuntime & {
	readonly label: string;
};

function createTaggedRuntime(label: string) {
	const runtime: TaggedRuntime = {
		label,
		dispose: vi.fn(async () => {}),
	};

	return { runtime };
}

describe('runtime combine identity laws', () => {
	it('preserves extras and lifecycle behaviour with left identity', async () => {
		const { runtime } = createTaggedRuntime('left');
		const combined = combineRuntimes(identityRuntime(), runtime);

		expect(combined.label).toBe(runtime.label);

		await combined.dispose();
		expect(runtime.dispose).toHaveBeenCalledOnce();
	});

	it('preserves extras and lifecycle behaviour with right identity', async () => {
		const { runtime } = createTaggedRuntime('right');
		const combined = combineRuntimes(runtime, identityRuntime());

		expect(combined.label).toBe(runtime.label);

		await combined.dispose();
		expect(runtime.dispose).toHaveBeenCalledOnce();
	});
});
