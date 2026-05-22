import { describe, expect, it } from 'vitest';
import { ConfigurationCycleError } from '../../cycle-error.js';
import { createConfiguration } from '../../create.js';
import { createConfigurationResolver } from '../create.js';

describe('createConfigurationResolver', () => {
	it('resolves static and computed inputs through the target combine function', () => {
		const account = createConfiguration<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = createConfiguration<number, string>({
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
		const score = createConfiguration<number>({
			name: 'score',
			combine: (values) => values.reduce((sum, value) => sum + value, 0),
		});
		const resolver = createConfigurationResolver([]);

		expect(resolver.getConfig(score)).toBe(0);
	});

	it('returns collected inputs when a configuration omits combine', () => {
		const values = createConfiguration<number>({
			name: 'values',
		});
		const resolver = createConfigurationResolver([
			{
				kind: 'static',
				configuration: values,
				input: 1,
			},
			{
				kind: 'static',
				configuration: values,
				input: 2,
			},
		]);

		expect(resolver.getConfig(values)).toEqual([1, 2]);
	});

	it('returns an empty list for omitted-combine configurations without contributions', () => {
		const values = createConfiguration<number>({
			name: 'values',
		});
		const resolver = createConfigurationResolver([]);

		expect(resolver.getConfig(values)).toEqual([]);
	});

	it('keeps configurations with the same configuration name distinct by identity', () => {
		const first = createConfiguration<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'light',
		});
		const second = createConfiguration<string>({
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
		const first = createConfiguration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = createConfiguration<number>({
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
		const first = createConfiguration<number>({
			name: 'first',
			combine: (values) => values.at(-1) ?? 0,
		});
		const second = createConfiguration<number>({
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
