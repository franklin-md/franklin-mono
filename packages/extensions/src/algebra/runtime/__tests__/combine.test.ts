import { describe, expect, it, vi } from 'vitest';
import type { BaseRuntime } from '../types.js';
import { combineRuntimes } from '../combine.js';
import { identityRuntime } from '../../../systems/identity/runtime.js';

type TaggedState = {
	tagged: string;
};

type TaggedRuntime = BaseRuntime<TaggedState> & {
	readonly label: string;
};

function createTaggedRuntime(label: string) {
	const unsubscribe = vi.fn();
	const runtime: TaggedRuntime = {
		label,
		state: {
			get: vi.fn(async () => ({ tagged: label })),
			fork: vi.fn(async () => ({ tagged: `${label}:fork` })),
			child: vi.fn(async () => ({ tagged: `${label}:child` })),
		},
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => unsubscribe),
	};

	return { runtime, unsubscribe };
}

describe('runtime combine identity laws', () => {
	it('preserves extras and lifecycle behaviour with left identity', async () => {
		const { runtime, unsubscribe } = createTaggedRuntime('left');
		const combined = combineRuntimes(identityRuntime(), runtime);
		const listener = vi.fn();

		expect(combined.label).toBe(runtime.label);
		await expect(combined.state.get()).resolves.toEqual({ tagged: 'left' });
		await expect(combined.state.fork()).resolves.toEqual({
			tagged: 'left:fork',
		});
		await expect(combined.state.child()).resolves.toEqual({
			tagged: 'left:child',
		});

		const unsub = combined.subscribe(listener);
		expect(runtime.subscribe).toHaveBeenCalledWith(listener);
		unsub();
		expect(unsubscribe).toHaveBeenCalledOnce();

		await combined.dispose();
		expect(runtime.dispose).toHaveBeenCalledOnce();
	});

	it('preserves extras and lifecycle behaviour with right identity', async () => {
		const { runtime, unsubscribe } = createTaggedRuntime('right');
		const combined = combineRuntimes(runtime, identityRuntime());
		const listener = vi.fn();

		expect(combined.label).toBe(runtime.label);
		await expect(combined.state.get()).resolves.toEqual({ tagged: 'right' });
		await expect(combined.state.fork()).resolves.toEqual({
			tagged: 'right:fork',
		});
		await expect(combined.state.child()).resolves.toEqual({
			tagged: 'right:child',
		});

		const unsub = combined.subscribe(listener);
		expect(runtime.subscribe).toHaveBeenCalledWith(listener);
		unsub();
		expect(unsubscribe).toHaveBeenCalledOnce();

		await combined.dispose();
		expect(runtime.dispose).toHaveBeenCalledOnce();
	});
});
