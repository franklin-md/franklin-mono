import { describe, expect, it } from 'vitest';
import { ConfigurationCycleError } from '../../cycle-error.js';
import { ConfigurationProvider } from '../../configuration.js';
import { createConfigurationResolver } from '../create.js';

describe('createConfigurationResolver', () => {
	it('resolves static and computed inputs through the target combine function', () => {
		const account = new ConfigurationProvider<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = new ConfigurationProvider<number, string>({
			name: 'maxPdfPages',
			combine: (values) => values.join(','),
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'static',
				provider: account,
				input: 'premium',
			},
			{
				kind: 'static',
				provider: maxPdfPages,
				input: 50,
			},
			{
				kind: 'computed',
				provider: maxPdfPages,
				dependencies: [account],
				compute: ({ getConfig }) =>
					getConfig(account) === 'premium' ? 100 : 10,
			},
		]);

		expect(resolver.getConfig(maxPdfPages)).toBe('50,100');
	});

	it('uses combine with an empty input list for configurations without contributions', () => {
		const score = new ConfigurationProvider<number>({
			name: 'score',
			combine: (values) => values.reduce((sum, value) => sum + value, 0),
		});
		const resolver = createConfigurationResolver([]);

		expect(resolver.getConfig(score)).toBe(0);
	});

	it('keeps providers with the same configuration name distinct by identity', () => {
		const first = new ConfigurationProvider<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const second = new ConfigurationProvider<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'static',
				provider: first,
				input: 'dark',
			},
			{
				kind: 'static',
				provider: second,
				input: 'contrast',
			},
		]);

		expect(resolver.getConfig(first)).toBe('dark');
		expect(resolver.getConfig(second)).toBe('contrast');
	});

	it('rejects computed reads outside declared dependencies', () => {
		const first = new ConfigurationProvider<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = new ConfigurationProvider<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'computed',
				provider: first,
				dependencies: [],
				compute: ({ getConfig }) => getConfig(second) + 1,
			},
		]);

		expect(() => resolver.getConfig(first)).toThrow(
			'Computed configuration "first" read undeclared dependency "second"',
		);
	});

	it('rejects dependency cycles during resolver creation', () => {
		const first = new ConfigurationProvider<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = new ConfigurationProvider<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});
		expect(() =>
			createConfigurationResolver([
				{
					kind: 'computed',
					provider: first,
					dependencies: [second],
					compute: ({ getConfig }) => getConfig(second) + 1,
				},
				{
					kind: 'computed',
					provider: second,
					dependencies: [first],
					compute: ({ getConfig }) => getConfig(first) + 1,
				},
			]),
		).toThrow(ConfigurationCycleError);
	});
});
