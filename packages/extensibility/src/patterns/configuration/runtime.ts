import { identityRuntime } from '../../modules/simple/identity.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { Configuration } from './configuration.js';
import { getConfigurationInternals } from './internal.js';

export type ConfigurationRuntime = BaseRuntime & {
	config<Input, Output>(configuration: Configuration<Input, Output>): Output;
};

export function createConfigurationRuntime(
	values: ReadonlyMap<symbol, unknown>,
): ConfigurationRuntime {
	return {
		...identityRuntime(),
		config<Input, Output>(configuration: Configuration<Input, Output>): Output {
			const internals = getConfigurationInternals(configuration);
			if (values.has(internals.id)) {
				return values.get(internals.id) as Output;
			}
			return internals.combine([]);
		},
	};
}
