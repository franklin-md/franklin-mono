import { describe, expect, expectTypeOf, it } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import { createApi } from '../../../extension-points/facade.js';
import { createRegistry } from '../../../extension-points/writer.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { Configuration } from '../configuration.js';
import { CONFIGURATION_REGISTRATION } from '../internal.js';
import {
	createConfigurationModule,
	type ConfigurationModule,
} from '../module.js';
import type { ConfigurationSignature } from '../types.js';

describe('createConfigurationModule', () => {
	it('is exported from the configuration pattern surface', () => {
		const module = createConfigurationModule();

		expectTypeOf(module).toEqualTypeOf<ConfigurationModule>();
	});

	it('uses a symbol-keyed registration API', () => {
		const module = createConfigurationModule();
		const { writer } = createRegistry<ConfigurationSignature, BaseRuntime>();
		const api = createApi<ConfigurationSignature, BaseRuntime>(
			module.extensionPoint,
			writer,
		);

		expect(Object.keys(api)).toEqual([]);
		expect(Reflect.ownKeys(api)).toContain(CONFIGURATION_REGISTRATION);
	});

	it('combines multiple contributions for one configuration into one runtime value', async () => {
		const module = createConfigurationModule();
		const promptPrefix = new Configuration<string, string>({
			name: 'promptPrefix',
			combine: (values) => values.join('\n'),
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				promptPrefix.of('first')(api);
				promptPrefix.of('second')(api);
			},
		);

		expect(runtime.config(promptPrefix)).toBe('first\nsecond');
		await runtime.dispose();
	});

	it('keeps configurations with the same name distinct by id', async () => {
		const module = createConfigurationModule();
		const first = new Configuration<string, string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const second = new Configuration<string, string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				first.of('dark')(api);
				second.of('contrast')(api);
			},
		);

		expect(runtime.config(first)).toBe('dark');
		expect(runtime.config(second)).toBe('contrast');
		await runtime.dispose();
	});

	it('uses combine with an empty input list for configurations without contributions', async () => {
		const module = createConfigurationModule();
		const score = new Configuration<number, number>({
			name: 'score',
			combine: (values) => values.reduce((sum, value) => sum + value, 0),
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			() => {},
		);

		expect(runtime.config(score)).toBe(0);
		await runtime.dispose();
	});
});
