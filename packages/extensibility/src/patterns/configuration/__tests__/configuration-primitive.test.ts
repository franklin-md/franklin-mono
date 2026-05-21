import { describe, expect, it } from 'vitest';
import type { Extension } from '../../../extension/types.js';
import { Configuration } from '../configuration.js';
import {
	CONFIGURATION_REGISTRATION,
	getConfigurationInternals,
} from '../internal.js';
import type {
	ConfigurationContribution,
	ConfigurationRegistrationAPI,
} from '../types.js';

function captureConfigurationContributions(): {
	readonly api: ConfigurationRegistrationAPI;
	readonly contributions: ConfigurationContribution[];
} {
	const contributions: ConfigurationContribution[] = [];
	return {
		api: {
			[CONFIGURATION_REGISTRATION](contribution) {
				contributions.push(contribution);
			},
		},
		contributions,
	};
}

describe('Configuration', () => {
	it('creates configurations with explicit combine functions', () => {
		const configuration = new Configuration<string>({
			name: 'list',
			combine: (values) => values,
		});
		const internals = getConfigurationInternals(configuration);
		const inputs = ['one', 'two'] as const;

		expect(internals.combine(inputs)).toBe(inputs);
	});

	it('creates configurations with custom combine functions', () => {
		const configuration = new Configuration<string, string>({
			name: 'joined',
			combine: (values) => values.join('\n'),
		});
		const internals = getConfigurationInternals(configuration);

		expect(internals.combine(['one', 'two'])).toBe('one\ntwo');
	});

	it('creates extensions that write contributions through the hidden registration API', () => {
		const configuration = new Configuration<string, string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});
		const extension: Extension<ConfigurationRegistrationAPI> =
			configuration.of('dark');
		const { api, contributions } = captureConfigurationContributions();

		extension(api);

		expect(contributions).toEqual([{ configuration, input: 'dark' }]);
	});

	it('keeps configuration methods and internals off enumerable object keys', () => {
		const configuration = new Configuration<string>({
			name: 'hidden',
			combine: (values) => values,
		});

		expect(Object.keys(configuration)).toEqual([]);
		expect(configuration.of).toBeTypeOf('function');
		expect(getConfigurationInternals(configuration).id).toBeTypeOf('symbol');
	});

	it('creates a unique symbol id for each configuration using the provided name as the description', () => {
		const first = new Configuration<string>({
			name: 'theme',
			combine: (values) => values,
		});
		const second = new Configuration<string>({
			name: 'theme',
			combine: (values) => values,
		});
		const firstInternals = getConfigurationInternals(first);
		const secondInternals = getConfigurationInternals(second);

		expect(firstInternals.name).toBe('theme');
		expect(firstInternals.id.description).toBe('theme');
		expect(secondInternals.id.description).toBe('theme');
		expect(firstInternals.id).not.toBe(secondInternals.id);
	});
});
