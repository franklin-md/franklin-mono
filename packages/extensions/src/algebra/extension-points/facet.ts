// TODO: Not sure it should go in this folder, maybe it should go in it's own module?

// TODO: Just name everything Configuration and make a mention how this is the same as a Static Facet from CodeMirro

import type { API, StaticAPI } from '../api/types.js';

type FacetRules<I, O> = {
	combine(contributions: I[]): O;
};

export type Configuration = {
	configuration: { set<T>(id: number, value: T): void };
};

export type FacetAPI = StaticAPI<Configuration>;

let nextId = 0;

export function createFacet<I, O>(options: FacetRules<I, O>) {
	const id = nextId++;
	return {
		// Returns an extension that contributes just this value.
		of: (value: I) => (api: Configuration) => {
			api.configuration.set<I>(id, value);
		},
	};
}
