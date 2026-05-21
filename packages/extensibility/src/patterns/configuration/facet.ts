import type { Extension } from '../../extension/types.js';
import { CONFIGURATION_REGISTRATION, FACET_INTERNALS } from './internal.js';
import type {
	ConfigurationRegistrationAPI,
	Facet,
	FacetInternals,
	FacetOptions,
} from './types.js';

class FacetInstance<Input, Output> implements Facet<Input, Output> {
	declare readonly [FACET_INTERNALS]: FacetInternals<Input, Output>;

	constructor(options: FacetOptions<Input, Output>) {
		Object.defineProperty(this, FACET_INTERNALS, {
			value: {
				id: Symbol(options.name),
				name: options.name,
				combine: options.combine,
			},
			enumerable: false,
			configurable: false,
		});
	}

	of(input: Input): Extension<ConfigurationRegistrationAPI> {
		return (api) => {
			api[CONFIGURATION_REGISTRATION]({ facet: this, input });
		};
	}
}

export function createFacet<Input, Output = readonly Input[]>(
	options: FacetOptions<Input, Output>,
): Facet<Input, Output> {
	return new FacetInstance(options);
}
