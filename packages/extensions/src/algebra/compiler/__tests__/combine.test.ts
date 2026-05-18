import { describe, expect, it, vi } from 'vitest';
import {
	identityCompiler,
	type IdentitySignature,
} from '../../modules/simple/identity.js';
import type { Signature } from '../../api/index.js';
import type { ExtensionPoint } from '../../extension-points/types.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import { createApi } from '../../extension-points/facade.js';
import { combine as combineExtensionPoints } from '../../extension-points/combine.js';
import type { RegistryView } from '../../extension-points/view.js';
import { createRegistry } from '../../extension-points/writer.js';
import type { StateHandle } from '../../modules/state/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { combine } from '../combine.js';
import { compile } from '../compile.js';
import type { Compiler } from '../types.js';

type CounterAPI = {
	registerCount(value: number): void;
};

interface CounterSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: CounterAPI;
}

const counterExtensionPoint = createExtensionPoint<CounterSignature>({
	registerCount: true,
});

const identityExtensionPoint = createExtensionPoint<IdentitySignature>({});

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
): Compiler<CounterSignature, CounterRuntime> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<CounterSignature, ContextRuntime>,
		) {
			const registeredCount = registry.argsFor('registerCount').at(-1)?.[0];
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
			};
		},
	};
}

function apiKeys<A extends Signature>(
	extensionPoint: ExtensionPoint<A>,
): string[] {
	const { writer } = createRegistry<A, A['In']>();
	return Object.keys(createApi<A, A['In']>(extensionPoint, writer));
}

describe('compiler combine identity laws', () => {
	it('preserves api and runtime shape with left identity', async () => {
		const baseline = createCounterCompiler({ count: 1 });
		const combined = combine(
			identityCompiler(),
			createCounterCompiler({ count: 1 }),
		);
		const combinedExtensionPoint = combineExtensionPoints(
			identityExtensionPoint,
			counterExtensionPoint,
		);

		expect(apiKeys(combinedExtensionPoint)).toEqual(
			apiKeys(counterExtensionPoint),
		);

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(counterExtensionPoint, baseline, (api) => api.registerCount(7)),
			compile(combinedExtensionPoint, combined, (api) => api.registerCount(7)),
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
		const combinedExtensionPoint = combineExtensionPoints(
			counterExtensionPoint,
			identityExtensionPoint,
		);

		expect(apiKeys(combinedExtensionPoint)).toEqual(
			apiKeys(counterExtensionPoint),
		);

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			compile(counterExtensionPoint, baseline, (api) => api.registerCount(11)),
			compile(combinedExtensionPoint, combined, (api) => api.registerCount(11)),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.getCount()).toBe(baselineRuntime.getCount());
		await expect(combinedRuntime[COUNTER_STATE].get()).resolves.toEqual(
			await baselineRuntime[COUNTER_STATE].get(),
		);
	});
});
