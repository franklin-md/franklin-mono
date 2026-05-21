import { describe, expect, it, vi } from 'vitest';
import type { StaticSignature } from '../../api/index.js';
import type { Registry } from '../../extension-points/registry.js';
import {
	createRegistryView,
	type RegistryView,
} from '../../extension-points/view.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { Compiler } from '../types.js';
import { applyStep, composeSteps, reduceSteps } from '../transform/index.js';

type TestAPI = {
	register(value: number): void;
};

type TestSignature = StaticSignature<TestAPI>;

type TestRuntime = BaseRuntime & {
	readonly value: number;
};

type TaggedRuntime = TestRuntime & {
	readonly tag: string;
};

function createCompiler(): Compiler<TestSignature, TestRuntime> {
	return {
		async compile(registry: RegistryView<TestSignature, BaseRuntime>) {
			return {
				value: registry.argsFor('register').at(-1)?.[0] ?? 0,
				dispose: vi.fn(async () => {}),
			};
		},
	};
}

function createRegistry(value: number): Registry<TestSignature, BaseRuntime> {
	return {
		effects: [
			{
				name: 'register',
				value: [value],
				meta: { priority: 0 },
				sequence: 0,
			},
		],
	};
}

const noGetRuntime = (): never => {
	throw new Error('getRuntime not used in this test');
};

describe('compiler transform steps', () => {
	it('applies a step to the runtime produced by a compiler', async () => {
		const transform = applyStep<TestSignature, TestRuntime, TaggedRuntime>(
			(runtime) => ({
				...runtime,
				tag: `value:${runtime.value}`,
			}),
		);
		const compiler = transform(createCompiler());

		const runtime = await compiler.compile(
			createRegistryView(createRegistry(4)),
			noGetRuntime,
		);

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
		});

		expect(runtime.value).toBe(2);
		expect(order).toEqual(['first', 'second']);
	});

	it('applies a runtime-preserving step after compile', async () => {
		const effect = vi.fn(async (_runtime: TestRuntime) => {});
		const compiler = applyStep<TestSignature, TestRuntime, TestRuntime>(
			async (runtime) => {
				await effect(runtime);
				return runtime;
			},
		)(createCompiler());

		const runtime = await compiler.compile(
			createRegistryView(createRegistry(9)),
			noGetRuntime,
		);

		expect(runtime.value).toBe(9);
		expect(effect).toHaveBeenCalledWith(runtime);
	});
});
