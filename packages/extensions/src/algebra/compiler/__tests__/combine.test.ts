import { describe, expect, it, vi } from 'vitest';
import type { BaseRuntime } from '../../runtime/types.js';
import { compile } from '../compile.js';
import { combine } from '../combine.js';
import type { Compiler } from '../types.js';
import { identityCompiler } from '../../../systems/identity/compiler.js';

type CounterAPI = {
	registerCount(value: number): void;
};

type CounterState = {
	count: number;
};

type CounterRuntime = BaseRuntime<CounterState> & {
	readonly label: string;
	getCount(): number;
};

function createCounterCompiler(): Compiler<
	CounterAPI,
	CounterState,
	CounterRuntime
> {
	let registeredCount: number | undefined;

	return {
		api: {
			registerCount(value) {
				registeredCount = value;
			},
		},
		async build(state) {
			const count = registeredCount ?? state.count;
			return {
				label: 'counter',
				getCount() {
					return count;
				},
				state: vi.fn(async () => ({ count })),
				fork: vi.fn(async () => ({ count })),
				child: vi.fn(async () => ({ count })),
				dispose: vi.fn(async () => {}),
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

describe('compiler combine identity laws', () => {
	it('preserves api and runtime shape with left identity', async () => {
		const baseline = createCounterCompiler();
		const combined = combine(identityCompiler(), createCounterCompiler());

		expect(Object.keys(combined.api)).toEqual(Object.keys(baseline.api));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(baseline, (api) => api.registerCount(7), { count: 1 }),
			compile(combined, (api) => api.registerCount(7), { count: 1 }),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.getCount()).toBe(baselineRuntime.getCount());
		await expect(combinedRuntime.state()).resolves.toEqual(
			await baselineRuntime.state(),
		);
	});

	it('preserves api and runtime shape with right identity', async () => {
		const baseline = createCounterCompiler();
		const combined = combine(createCounterCompiler(), identityCompiler());

		expect(Object.keys(combined.api)).toEqual(Object.keys(baseline.api));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(baseline, (api) => api.registerCount(11), { count: 2 }),
			compile(combined, (api) => api.registerCount(11), { count: 2 }),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.getCount()).toBe(baselineRuntime.getCount());
		await expect(combinedRuntime.state()).resolves.toEqual(
			await baselineRuntime.state(),
		);
	});
});
