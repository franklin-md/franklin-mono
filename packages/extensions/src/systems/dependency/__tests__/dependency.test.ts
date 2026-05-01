import { describe, it, expect, expectTypeOf, vi } from 'vitest';
import type { DependencyRuntime as ApiIndexDependencyRuntime } from '../../../index.js';
import {
	createDependencySystem,
	createRuntime,
	type DependencyRuntime,
	type DependencySystem,
} from '../../../index.js';
import { createDependencySystem as createDependencySystemFromRuntimeSystemIndex } from '../system.js';

describe('createDependencySystem', () => {
	it('is exported from the public surfaces', () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencySystemFromRuntimeSystemIndex(
			'settings',
			settings,
		);

		expectTypeOf(system).toEqualTypeOf<
			DependencySystem<'settings', typeof settings>
		>();
		expectTypeOf<
			ApiIndexDependencyRuntime<'settings', typeof settings>
		>().toEqualTypeOf<DependencyRuntime<'settings', typeof settings>>();
	});

	it('exposes the dependency as a runtime field keyed by the name', async () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencySystem('settings', settings);

		const runtime = await createRuntime(system, {}, []);

		expectTypeOf(runtime.settings).toEqualTypeOf<typeof settings>();
		expect(runtime.settings).toBe(settings);
		expect(await system.state(runtime).get()).toEqual({});
		expect(await system.state(runtime).fork()).toEqual({});
		expect(await system.state(runtime).child()).toEqual({});

		const unsubscribe = runtime.subscribe(() => {});
		unsubscribe();
		await runtime.dispose();
	});

	it('keys the runtime field by the configured name', async () => {
		const auth = { token: 'abc' };
		const runtime = await createRuntime(
			createDependencySystem('auth', auth),
			{},
			[],
		);

		expectTypeOf(runtime.auth).toEqualTypeOf<typeof auth>();
		expect(runtime.auth).toBe(auth);
	});
});
