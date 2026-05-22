import { describe, expect, it } from 'vitest';
import type { Extension } from '../../../extension/types.js';
import type { ConfigurationSpec } from '../configuration.js';
import { createConfiguration } from '../create.js';
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
		const spec: ConfigurationSpec<string> = {
			name: 'list',
			combine: (values) => values.at(-1) ?? 'fallback',
		};
		const inputs = ['one', 'two'] as const;

		expect(spec.combine(inputs)).toBe('two');
	});

	it('allows configurations to combine inputs into a custom output type', () => {
		const spec: ConfigurationSpec<string, string> = {
			name: 'joined',
			combine: (values) => values.join('\n'),
		};

		expect(spec.combine(['one', 'two'])).toBe('one\ntwo');
	});

	it('defaults configurations without combine functions to collected inputs', () => {
		const tags = createConfiguration<string>({
			name: 'tags',
		});

		expect(tags.name).toBe('tags');
		expect(tags.combine(['alpha', 'beta'])).toEqual(['alpha', 'beta']);
		expect(tags.spec.combine(['alpha', 'beta'])).toEqual(['alpha', 'beta']);
	});

	it('treats undefined combine functions as collected inputs', () => {
		const tags = createConfiguration<string>({
			name: 'tags',
			combine: undefined,
		});

		expect(tags.name).toBe('tags');
		expect(tags.combine(['alpha', 'beta'])).toEqual(['alpha', 'beta']);
		expect(tags.spec.combine(['alpha', 'beta'])).toEqual(['alpha', 'beta']);
	});

	it('creates extensions from configurations that write static values through the configuration API', () => {
		const theme = createConfiguration<string, string>({
			name: 'theme',
			combine: (values) => values[0] ?? 'fallback',
		});
		const extension: Extension<ConfigurationAPI> = theme.of('dark');
		const { api, contributions } = captureConfigurationContributions();

		extension(api);

		expect(contributions).toEqual([
			{ kind: 'static', configuration: theme, input: 'dark' },
		]);
	});

	it('creates extensions from configurations that write computed values through the configuration API', () => {
		const account = createConfiguration<'free' | 'premium'>({
			name: 'account',
			combine: (values) => values.at(-1) ?? 'free',
		});
		const maxPdfPages = createConfiguration<number>({
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
			configuration: maxPdfPages,
			dependencies: [account],
		});
	});

	it('keeps configuration methods on the prototype and exposes the configuration spec', () => {
		const spec: ConfigurationSpec<string> = {
			name: 'hidden',
			combine: (values) => values.at(-1) ?? 'fallback',
		};
		const configuration = createConfiguration(spec);

		expect(configuration.spec).toEqual(spec);
		expect(Object.isFrozen(configuration.spec)).toBe(true);
		expect(configuration.of).toBeTypeOf('function');
		expect(configuration.compute).toBeTypeOf('function');
	});

	it('keeps configurations with the same configuration name distinct by object identity', () => {
		const first = createConfiguration<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});
		const second = createConfiguration<string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});

		expect(first.name).toBe('theme');
		expect(second.name).toBe('theme');
		expect(first).not.toBe(second);
	});
});
