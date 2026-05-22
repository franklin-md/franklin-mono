import { describe, expect, it } from 'vitest';
import { ConfigurationCycleError } from '../../cycle-error.js';
import { Configuration } from '../../configuration.js';
import { createConfigurationResolver } from '../create.js';

describe('createConfigurationResolver', () => {
	it('resolves static and computed inputs through the target combine function', () => {
		const account = new Configuration<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = new Configuration<number, string>({
			name: 'maxPdfPages',
			combine: (values) => values.join(','),
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'static',
				configuration: account,
				input: 'premium',
			},
			{
				kind: 'static',
				configuration: maxPdfPages,
				input: 50,
			},
			{
				kind: 'computed',
				configuration: maxPdfPages,
				dependencies: [account],
				compute: ({ getConfig }) =>
					getConfig(account) === 'premium' ? 100 : 10,
			},
		]);

		expect(resolver.getConfig(maxPdfPages)).toBe('50,100');
	});

	it('uses combine with an empty input list for configurations without contributions', () => {
		const score = new Configuration<number>({
			name: 'score',
			combine: (values) => values.reduce((sum, value) => sum + value, 0),
		});
		const resolver = createConfigurationResolver([]);

		expect(resolver.getConfig(score)).toBe(0);
	});

	it('keeps configurations with the same configuration name distinct by identity', () => {
		const first = new Configuration<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const second = new Configuration<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'static',
				configuration: first,
				input: 'dark',
			},
			{
				kind: 'static',
				configuration: second,
				input: 'contrast',
			},
		]);

		expect(resolver.getConfig(first)).toBe('dark');
		expect(resolver.getConfig(second)).toBe('contrast');
	});

	it('rejects computed reads outside declared dependencies', () => {
		const first = new Configuration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = new Configuration<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'computed',
				configuration: first,
				dependencies: [],
				compute: ({ getConfig }) => getConfig(second) + 1,
			},
		]);

		expect(() => resolver.getConfig(first)).toThrow(
			'Computed configuration "first" read undeclared dependency "second"',
		);
	});

	it('rejects dependency cycles during resolver creation', () => {
		const first = new Configuration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = new Configuration<number>({
			name: 'second',
			combine: (values) => values.at(-1) ?? 0,
		});
		expect(() =>
			createConfigurationResolver([
				{
					kind: 'computed',
					configuration: first,
					dependencies: [second],
					compute: ({ getConfig }) => getConfig(second) + 1,
				},
				{
					kind: 'computed',
					configuration: second,
					dependencies: [first],
					compute: ({ getConfig }) => getConfig(first) + 1,
				},
			]),
		).toThrow(ConfigurationCycleError);
	});
});
