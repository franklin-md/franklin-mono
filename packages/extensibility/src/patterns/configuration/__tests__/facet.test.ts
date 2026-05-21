import { describe, expect, it } from 'vitest';
import type { Extension } from '../../../extension/types.js';
import { createFacet } from '../facet.js';
import { CONFIGURATION_REGISTRATION, getFacetInternals } from '../internal.js';
import type {
	ConfigurationContribution,
	ConfigurationRegistrationAPI,
} from '../types.js';

function captureFacetContributions(): {
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

describe('createFacet', () => {
	it('creates facets with explicit combine functions', () => {
		const facet = createFacet<string>({
			name: 'list',
			combine: (values) => values,
		});
		const internals = getFacetInternals(facet);
		const inputs = ['one', 'two'] as const;

		expect(internals.combine(inputs)).toBe(inputs);
	});

	it('creates facets with custom combine functions', () => {
		const facet = createFacet<string, string>({
			name: 'joined',
			combine: (values) => values.join('\n'),
		});
		const internals = getFacetInternals(facet);

		expect(internals.combine(['one', 'two'])).toBe('one\ntwo');
	});

	it('creates extensions that write facet contributions through the hidden registration API', () => {
		const facet = createFacet<string, string>({
			name: 'theme',
			combine: (values) => values.at(-1) ?? 'fallback',
		});
		const extension: Extension<ConfigurationRegistrationAPI> = facet.of('dark');
		const { api, contributions } = captureFacetContributions();

		extension(api);

		expect(contributions).toEqual([{ facet, input: 'dark' }]);
	});

	it('keeps facet methods and internals off enumerable object keys', () => {
		const facet = createFacet<string>({
			name: 'hidden',
			combine: (values) => values,
		});

		expect(Object.keys(facet)).toEqual([]);
		expect(facet.of).toBeTypeOf('function');
		expect(getFacetInternals(facet).id).toBeTypeOf('symbol');
	});

	it('creates a unique symbol id for each facet using the provided name as the description', () => {
		const first = createFacet<string>({
			name: 'theme',
			combine: (values) => values,
		});
		const second = createFacet<string>({
			name: 'theme',
			combine: (values) => values,
		});
		const firstInternals = getFacetInternals(first);
		const secondInternals = getFacetInternals(second);

		expect(firstInternals.name).toBe('theme');
		expect(firstInternals.id.description).toBe('theme');
		expect(secondInternals.id.description).toBe('theme');
		expect(firstInternals.id).not.toBe(secondInternals.id);
	});
});
