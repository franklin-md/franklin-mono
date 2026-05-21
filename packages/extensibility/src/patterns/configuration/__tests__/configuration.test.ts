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

		expect(runtime.getConfig(promptPrefix)).toBe('first\nsecond');
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

		expect(runtime.getConfig(first)).toBe('dark');
		expect(runtime.getConfig(second)).toBe('contrast');
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

		expect(runtime.getConfig(score)).toBe(0);
		await runtime.dispose();
	});

	it('resolves computed configuration values from declared dependencies', async () => {
		const module = createConfigurationModule();
		const account = new Configuration<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = new Configuration<number>({
			name: 'maxPdfPages',
			combine: (values) => values.at(-1) ?? 10,
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				account.of('premium')(api);
				maxPdfPages.compute([account], ({ getConfig }) =>
					getConfig(account) === 'premium' ? 100 : 10,
				)(api);
			},
		);

		expect(runtime.getConfig(maxPdfPages)).toBe(100);
		await runtime.dispose();
	});

	it('rejects declared computed dependency cycles during compile', async () => {
		const module = createConfigurationModule();
		const first = new Configuration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = new Configuration<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});

		await expect(
			compile(module.extensionPoint, module.compiler, (api) => {
				first.compute([second], ({ getConfig }) => getConfig(second) + 1)(api);
				second.compute([first], ({ getConfig }) => getConfig(first) + 1)(api);
			}),
		).rejects.toThrow(
			'Circular configuration computation: first -> second -> first',
		);
	});
});
