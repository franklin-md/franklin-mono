import { identityRuntime } from '../../modules/simple/identity.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { getFacetInternals } from './internal.js';
import type { Facet } from './types.js';

export type ConfigurationRuntime = BaseRuntime & {
	config<Input, Output>(facet: Facet<Input, Output>): Output;
};

export function createConfigurationRuntime(
	values: ReadonlyMap<symbol, unknown>,
): ConfigurationRuntime {
	return {
		...identityRuntime(),
		config<Input, Output>(facet: Facet<Input, Output>): Output {
			const internals = getFacetInternals(facet);
			if (values.has(internals.id)) {
				return values.get(internals.id) as Output;
			}
			return internals.combine([]);
		},
	};
}
