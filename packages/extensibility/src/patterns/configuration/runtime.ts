import { identityRuntime } from '../../modules/simple/identity.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { Configuration } from './configuration.js';
import { createConfigurationResolver } from './resolver/create.js';
import type { ConfigurationValue } from './value.js';

export type ConfigurationRuntime = BaseRuntime & {
	getConfig<Input, Output>(configuration: Configuration<Input, Output>): Output;
};

export function createConfigurationRuntime(
	values: readonly ConfigurationValue[],
): ConfigurationRuntime {
	const resolver = createConfigurationResolver(values);
	return {
		...identityRuntime(),
		getConfig(configuration) {
			return resolver.getConfig(configuration);
		},
	};
}
