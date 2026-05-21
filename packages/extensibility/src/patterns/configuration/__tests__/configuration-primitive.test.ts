import { describe, expect, it } from 'vitest';
import type { Extension } from '../../../extension/types.js';
import { ConfigurationProvider, type Configuration } from '../configuration.js';
import { CONFIGURATION_API } from '../internal.js';
import type { ConfigurationAPI } from '../types.js';
import type { ConfigurationContribution } from '../contribution.js';

function captureConfigurationContributions(): {
	readonly api: ConfigurationAPI;
	readonly contributions: ConfigurationContribution[];
} {
	const contributions: ConfigurationContribution[] = [];
	return {
		api: {
			[CONFIGURATION_API](value) {
				contributions.push(value);
			},
		},
		contributions,
	};
}

describe('Configuration', () => {
	it('is the configuration specification with an explicit combine function', () => {
		const configuration: Configuration<string> = {
			name: 'list',
			combine: (values) => values.at(-1) ?? 'fallback',
		};
		const inputs = ['one', 'two'] as const;

		expect(configuration.combine(inputs)).toBe('two');
	});

	it('allows configurations to combine inputs into a custom output type', () => {
		const configuration: Configuration<string, string> = {
			name: 'joined',
			combine: (values) => values.join('\n'),
		};

		expect(configuration.combine(['one', 'two'])).toBe('one\ntwo');
	});

	it('creates extensions from providers that write static values through the configuration API', () => {
		const provider = new ConfigurationProvider<string, string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});
		const extension: Extension<ConfigurationAPI> = provider.of('dark');
		const { api, contributions } = captureConfigurationContributions();

		extension(api);

		expect(contributions).toEqual([
			{ kind: 'static', provider, input: 'dark' },
		]);
	});

	it('creates extensions from providers that write computed values through the configuration API', () => {
		const account = new ConfigurationProvider<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = new ConfigurationProvider<number>({
			name: 'maxPdfPages',
			combine: (values) => values.at(-1) ?? 10,
		});
		const extension: Extension<ConfigurationAPI> = maxPdfPages.compute(
			[account],
			({ getConfig }) => (getConfig(account) === 'premium' ? 100 : 10),
		);
		const { api, contributions } = captureConfigurationContributions();

		extension(api);

		expect(contributions).toHaveLength(1);
		expect(contributions[0]).toMatchObject({
			kind: 'computed',
			provider: maxPdfPages,
			dependencies: [account],
		});
	});

	it('keeps provider methods on the prototype and exposes the configuration spec', () => {
		const configuration: Configuration<string> = {
			name: 'hidden',
			combine: (values) => values.at(-1) ?? 'fallback',
		};
		const provider = new ConfigurationProvider(configuration);

		expect(provider.configuration).toEqual(configuration);
		expect(Object.isFrozen(provider.configuration)).toBe(true);
		expect(provider.of).toBeTypeOf('function');
		expect(provider.compute).toBeTypeOf('function');
	});

	it('keeps providers with the same configuration name distinct by object identity', () => {
		const first = new ConfigurationProvider<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});
		const second = new ConfigurationProvider<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});

		expect(first.name).toBe('theme');
		expect(second.name).toBe('theme');
		expect(first).not.toBe(second);
	});
});
