import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import { priority } from '../../../transforms/priority.js';
import {
	createLifecycleModule,
	type LifecycleModule,
	type LifecycleRuntime,
	type LifecycleUnload,
} from '../../../module.js';
import { createLifecycleModule as createLifecycleModuleFromModuleFile } from '../module.js';

describe('createLifecycleModule', () => {
	it('is exported from the public module surface', () => {
		const module = createLifecycleModuleFromModuleFile();

		expectTypeOf(module).toEqualTypeOf<LifecycleModule>();
	});

	it('runs unload handlers when the runtime is disposed', async () => {
		const module = createLifecycleModule();
		const syncUnload = vi.fn();
		const asyncUnload = vi.fn(async () => {});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.onUnload(syncUnload);
				api.onUnload(asyncUnload);
			},
		);

		expectTypeOf(runtime).toEqualTypeOf<LifecycleRuntime>();
		expect(syncUnload).not.toHaveBeenCalled();
		expect(asyncUnload).not.toHaveBeenCalled();

		await runtime.dispose();

		expect(syncUnload).toHaveBeenCalledOnce();
		expect(asyncUnload).toHaveBeenCalledOnce();
	});

	it('runs unload handlers in effective priority order', async () => {
		const module = createLifecycleModule();
		const events: string[] = [];

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.onUnload(() => {
					events.push('default-one');
				});
				priority.low(api).onUnload(() => {
					events.push('low');
				});
				priority.high(api).onUnload(() => {
					events.push('high');
				});
				api.onUnload(() => {
					events.push('default-two');
				});
			},
		);

		await runtime.dispose();

		expect(events).toEqual(['high', 'default-one', 'default-two', 'low']);
	});

	it('runs later unload handlers after an earlier handler fails', async () => {
		const module = createLifecycleModule();
		const events: string[] = [];
		const error = new Error('first unload failed');

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.onUnload(() => {
					events.push('first');
					throw error;
				});
				api.onUnload(() => {
					events.push('second');
				});
			},
		);

		await expect(runtime.dispose()).rejects.toBe(error);
		expect(events).toEqual(['first', 'second']);
	});

	it('accepts unload handlers that do not receive runtime access', () => {
		const unload: LifecycleUnload = vi.fn(async () => {});

		expectTypeOf(unload).parameters.toEqualTypeOf<[]>();
	});
});
