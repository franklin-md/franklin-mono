import { describe, it, expect, expectTypeOf, vi } from 'vitest';
import type { DependencyRuntime as ApiIndexDependencyRuntime } from '../../../index.js';
import {
	createDependencyModule,
	createRuntime,
	type DependencyRuntime,
	type DependencyModule,
} from '../../../index.js';
import { createDependencyModule as createDependencyModuleFromHarnessModuleIndex } from '../module.js';

describe('createDependencyModule', () => {
	it('is exported from the public surfaces', () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencyModuleFromHarnessModuleIndex(
			'settings',
			settings,
		);

		expectTypeOf(system).toEqualTypeOf<
			DependencyModule<'settings', typeof settings>
		>();
		expectTypeOf<
			ApiIndexDependencyRuntime<'settings', typeof settings>
		>().toEqualTypeOf<DependencyRuntime<'settings', typeof settings>>();
	});

	it('exposes the dependency as a runtime field keyed by the name', async () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencyModule('settings', settings);

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
			createDependencyModule('auth', auth),
			{},
			[],
		);

		expectTypeOf(runtime.auth).toEqualTypeOf<typeof auth>();
		expect(runtime.auth).toBe(auth);
	});
});
