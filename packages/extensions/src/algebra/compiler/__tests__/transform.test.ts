import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../api/index.js';
import type { Registry } from '../../extension-points/registry.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { Compiler } from '../types.js';
import { applyStep, composeSteps, reduceSteps } from '../transform/index.js';

type TestAPISurface = {
	register(value: number): void;
};

type TestAPI = StaticAPI<TestAPISurface>;

type TestRuntime = BaseRuntime & {
	readonly value: number;
};

type TaggedRuntime = TestRuntime & {
	readonly tag: string;
};

function createCompiler(): Compiler<TestAPI, TestRuntime> {
	return {
		async compile(registry: Registry<TestAPI>) {
			return {
				value: registry.register.at(-1)?.[0] ?? 0,
				dispose: vi.fn(async () => {}),
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

function createRegistry(value: number): Registry<TestAPI> {
	return {
		register: [[value]],
	};
}

const noGetRuntime = (): never => {
	throw new Error('getRuntime not used in this test');
};

describe('compiler transform steps', () => {
	it('applies a step to the runtime produced by a compiler', async () => {
		const transform = applyStep<TestAPI, TestRuntime, TaggedRuntime>(
			async (runtime) => ({
				...runtime,
				tag: `value:${runtime.value}`,
			}),
		);
		const compiler = transform(createCompiler());

		const runtime = await compiler.compile(createRegistry(4), noGetRuntime);

		expect(runtime.value).toBe(4);
		expect(runtime.tag).toBe('value:4');
	});

	it('composes compiler steps from left to right', async () => {
		const order: string[] = [];
		const step = composeSteps(
			async (runtime: TestRuntime): Promise<TaggedRuntime> => {
				order.push('first');
				return { ...runtime, tag: 'tagged' };
			},
			async (runtime) => {
				order.push(runtime.tag);
				return runtime;
			},
		);

		const runtime = await step({
			value: 1,
			dispose: vi.fn(async () => {}),
			subscribe: vi.fn(() => () => {}),
		});

		expect(order).toEqual(['first', 'tagged']);
		expect(runtime.tag).toBe('tagged');
	});

	it('reduces runtime-preserving steps from left to right', async () => {
		const order: string[] = [];
		const step = reduceSteps<TestRuntime>([
			async (runtime) => {
				order.push('first');
				return runtime;
			},
			async (runtime) => {
				order.push('second');
				return runtime;
			},
		]);

		const runtime = await step({
			value: 2,
			dispose: vi.fn(async () => {}),
			subscribe: vi.fn(() => () => {}),
		});

		expect(runtime.value).toBe(2);
		expect(order).toEqual(['first', 'second']);
	});

	it('applies a runtime-preserving step after compile', async () => {
		const tap = vi.fn(async (_runtime: TestRuntime) => {});
		const compiler = applyStep<TestAPI, TestRuntime, TestRuntime>(
			async (runtime) => {
				await tap(runtime);
				return runtime;
			},
		)(createCompiler());

		const runtime = await compiler.compile(createRegistry(9), noGetRuntime);

		expect(runtime.value).toBe(9);
		expect(tap).toHaveBeenCalledWith(runtime);
	});
});
