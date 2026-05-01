import { describe, expect, it, vi } from 'vitest';
import type { BaseRuntime, StateHandle } from '../../runtime/types.js';
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

const COUNTER_STATE: unique symbol = Symbol('test/counter-state');

type CounterRuntime = BaseRuntime & {
	readonly label: string;
	getCount(): number;
	readonly [COUNTER_STATE]: StateHandle<CounterState>;
};

function createCounterCompiler(
	state: CounterState,
): Compiler<CounterAPI, CounterRuntime> {
	let registeredCount: number | undefined;

	return {
		api: {
			registerCount(value) {
				registeredCount = value;
			},
		},
		async build() {
			const count = registeredCount ?? state.count;
			return {
				label: 'counter',
				getCount() {
					return count;
				},
				[COUNTER_STATE]: {
					get: vi.fn(async () => ({ count })),
					fork: vi.fn(async () => ({ count })),
					child: vi.fn(async () => ({ count })),
				},
				dispose: vi.fn(async () => {}),
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

describe('compiler combine identity laws', () => {
	it('preserves api and runtime shape with left identity', async () => {
		const baseline = createCounterCompiler({ count: 1 });
		const combined = combine(
			identityCompiler(),
			createCounterCompiler({ count: 1 }),
		);

		expect(Object.keys(combined.api)).toEqual(Object.keys(baseline.api));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(baseline, (api) => api.registerCount(7)),
			compile(combined, (api) => api.registerCount(7)),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.getCount()).toBe(baselineRuntime.getCount());
		await expect(combinedRuntime[COUNTER_STATE].get()).resolves.toEqual(
			await baselineRuntime[COUNTER_STATE].get(),
		);
	});

	it('preserves api and runtime shape with right identity', async () => {
		const baseline = createCounterCompiler({ count: 2 });
		const combined = combine(
			createCounterCompiler({ count: 2 }),
			identityCompiler(),
		);

		expect(Object.keys(combined.api)).toEqual(Object.keys(baseline.api));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(baseline, (api) => api.registerCount(11)),
			compile(combined, (api) => api.registerCount(11)),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.getCount()).toBe(baselineRuntime.getCount());
		await expect(combinedRuntime[COUNTER_STATE].get()).resolves.toEqual(
			await baselineRuntime[COUNTER_STATE].get(),
		);
	});
});
