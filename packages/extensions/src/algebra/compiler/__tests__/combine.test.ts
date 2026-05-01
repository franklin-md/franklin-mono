import { describe, expect, it, vi } from 'vitest';
import { identityCompiler } from '../../../systems/identity/compiler.js';
import type { API, BoundAPI } from '../../api/index.js';
import type { BaseRuntime, StateHandle } from '../../runtime/types.js';
import { combine } from '../combine.js';
import { compile } from '../compile.js';
import type { Compiler } from '../types.js';

type CounterAPISurface = {
	registerCount(value: number): void;
};

interface CounterAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: CounterAPISurface;
}

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

	const api: CounterAPISurface = {
		registerCount(value) {
			registeredCount = value;
		},
	};

	return {
		register<ContextRuntime extends CounterRuntime>(
			use: (api: BoundAPI<CounterAPI, ContextRuntime>) => void,
		): void {
			use(api);
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

function apiKeys<A extends API, Runtime extends BaseRuntime & A['In']>(
	compiler: Compiler<A, Runtime>,
): string[] {
	let keys: string[] = [];
	compiler.register<Runtime>((api) => {
		keys = Object.keys(api);
	});
	return keys;
}

describe('compiler combine identity laws', () => {
	it('preserves api and runtime shape with left identity', async () => {
		const baseline = createCounterCompiler({ count: 1 });
		const combined = combine(
			identityCompiler(),
			createCounterCompiler({ count: 1 }),
		);

		expect(apiKeys(combined)).toEqual(apiKeys(baseline));

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

		expect(apiKeys(combined)).toEqual(apiKeys(baseline));

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
