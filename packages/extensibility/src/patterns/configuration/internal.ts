import type { Facet, FacetInternals } from './types.js';

export const FACET_INTERNALS: unique symbol = Symbol(
	'franklin.facet.internals',
);

export const CONFIGURATION_REGISTRATION: unique symbol = Symbol(
	'franklin.configuration.registration',
);

export function getFacetInternals<Input, Output>(
	facet: Facet<Input, Output>,
): FacetInternals<Input, Output> {
	return facet[FACET_INTERNALS];
}
