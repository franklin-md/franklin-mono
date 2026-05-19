import { describe, it, expect, expectTypeOf, vi } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import type { DependencyRuntime as ApiIndexDependencyRuntime } from '../../../index.js';
import {
	createDependencyModule,
	type DependencyRuntime,
	type DependencyModule,
} from '../../../index.js';
import { createDependencyModule as createDependencyModuleFromModuleFile } from '../module.js';

describe('createDependencyModule', () => {
	it('is exported from the public surfaces', () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencyModuleFromModuleFile('settings', settings);

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

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			() => {},
		);

		expectTypeOf(runtime.settings).toEqualTypeOf<typeof settings>();
		expect(runtime.settings).toBe(settings);

		await runtime.dispose();
	});

	it('keys the runtime field by the configured name', async () => {
		const auth = { token: 'abc' };
		const system = createDependencyModule('auth', auth);
		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			() => {},
		);

		expectTypeOf(runtime.auth).toEqualTypeOf<typeof auth>();
		expect(runtime.auth).toBe(auth);
	});
});
