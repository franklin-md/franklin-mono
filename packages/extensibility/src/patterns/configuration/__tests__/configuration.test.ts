import { describe, expect, expectTypeOf, it } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import { createApi } from '../../../extension-points/facade.js';
import { createRegistry } from '../../../extension-points/writer.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { priority } from '../../../transforms/priority.js';
import { createConfiguration } from '../create.js';
import { ConfigurationCycleError } from '../cycle-error.js';
import { CONFIGURATION_API } from '../internal.js';
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

	it('uses a symbol-keyed configuration API', () => {
		const module = createConfigurationModule();
		const { writer } = createRegistry<ConfigurationSignature, BaseRuntime>();
		const api = createApi<ConfigurationSignature, BaseRuntime>(
			module.extensionPoint,
			writer,
		);

		expect(Object.keys(api)).toEqual([]);
		expect(Reflect.ownKeys(api)).toContain(CONFIGURATION_API);
	});

	it('combines multiple contributions for one configuration into one runtime value', async () => {
		const module = createConfigurationModule();
		const promptPrefix = createConfiguration<string, string>({
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

	it('passes contributions to combine in effective priority order', async () => {
		const module = createConfigurationModule();
		const theme = createConfiguration<string, string>({
			name: 'theme',
			combine: (values) => values.join(' > '),
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				theme.of('default-one')(api);
				priority.low(theme.of('low'))(api);
				priority.high(theme.of('high'))(api);
				theme.of('default-two')(api);
			},
		);

		expect(runtime.getConfig(theme)).toBe(
			'high > default-one > default-two > low',
		);
		await runtime.dispose();
	});

	it('collects configuration inputs in effective priority order when combine is omitted', async () => {
		const module = createConfigurationModule();
		const promptFragments = createConfiguration<string>({
			name: 'promptFragments',
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				promptFragments.of('default-one')(api);
				priority.low(api)[CONFIGURATION_API]({
					kind: 'static',
					configuration: promptFragments,
					input: 'low',
				});
				priority.high(api)[CONFIGURATION_API]({
					kind: 'static',
					configuration: promptFragments,
					input: 'high',
				});
				promptFragments.of('default-two')(api);
			},
		);

		expect(runtime.getConfig(promptFragments)).toEqual([
			'high',
			'default-one',
			'default-two',
			'low',
		]);
		await runtime.dispose();
	});

	it('keeps configurations with the same configuration name distinct by identity', async () => {
		const module = createConfigurationModule();
		const first = createConfiguration<string, string>({
			name: 'theme',
			combine: (values) => values[0] ?? 'light',
		});
		const second = createConfiguration<string, string>({
			name: 'theme',
			combine: (values) => values[0] ?? 'light',
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
		const score = createConfiguration<number, number>({
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

	it('returns an empty input list for omitted-combine configurations without contributions', async () => {
		const module = createConfigurationModule();
		const promptFragments = createConfiguration<string>({
			name: 'promptFragments',
		});

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			() => {},
		);

		expect(runtime.getConfig(promptFragments)).toEqual([]);
		await runtime.dispose();
	});

	it('uses the construction-time configuration spec after the original object mutates', async () => {
		const module = createConfigurationModule();
		const configuration = {
			name: 'score',
			combine: (values: readonly number[]) =>
				values.reduce((sum, value) => sum + value, 0),
		};
		const score = createConfiguration<number, number>(configuration);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				score.of(1)(api);
				score.of(2)(api);
			},
		);
		configuration.name = 'mutated';
		configuration.combine = () => 999;

		expect(runtime.getConfig(score)).toBe(3);
		await runtime.dispose();
	});

	it('resolves computed configuration values from declared dependencies', async () => {
		const module = createConfigurationModule();
		const account = createConfiguration<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = createConfiguration<number>({
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
		const first = createConfiguration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = createConfiguration<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});

		await expect(
			compile(module.extensionPoint, module.compiler, (api) => {
				first.compute([second], ({ getConfig }) => getConfig(second) + 1)(api);
				second.compute([first], ({ getConfig }) => getConfig(first) + 1)(api);
			}),
		).rejects.toThrow(ConfigurationCycleError);
	});
});
