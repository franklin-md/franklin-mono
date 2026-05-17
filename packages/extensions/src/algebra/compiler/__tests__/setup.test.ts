import { describe, expect, it, vi } from 'vitest';
import type { StaticSignature } from '../../api/index.js';
import type { Registry } from '../../extension-points/registry.js';
import {
	createRegistryView,
	type RegistryView,
} from '../../extension-points/view.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { Compiler } from '../types.js';
import {
	composeCompilerSteps,
	transformCompiler,
	withSetupCompiler,
} from '../setup.js';

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
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

function createRegistry(value: number): Registry<TestSignature, BaseRuntime> {
	return {
		effects: [{ name: 'register', value: [value] }],
	};
}

const noGetRuntime = (): never => {
	throw new Error('getRuntime not used in this test');
};

describe('compiler setup steps', () => {
	it('transforms the runtime produced by a compiler', async () => {
		const compiler = transformCompiler(createCompiler(), async (runtime) => ({
			...runtime,
			tag: `value:${runtime.value}`,
		}));

		const runtime = await compiler.compile(
			createRegistryView(createRegistry(4)),
			noGetRuntime,
		);

		expect(runtime.value).toBe(4);
		expect(runtime.tag).toBe('value:4');
	});

	it('composes compiler steps from left to right', async () => {
		const order: string[] = [];
		const step = composeCompilerSteps(
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

	it('runs setup after compile and returns the original runtime', async () => {
		const setup = vi.fn(async (_runtime: TestRuntime) => {});
		const compiler = withSetupCompiler(createCompiler(), setup);

		const runtime = await compiler.compile(
			createRegistryView(createRegistry(9)),
			noGetRuntime,
		);

		expect(runtime.value).toBe(9);
		expect(setup).toHaveBeenCalledWith(runtime);
	});
});
