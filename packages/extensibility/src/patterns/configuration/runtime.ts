import { identityRuntime } from '../../modules/simple/identity.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { ConfigurationProvider } from './configuration.js';
import type { ConfigurationContribution } from './contribution.js';
import { createConfigurationResolver } from './resolver/create.js';

export type ConfigurationRuntime = BaseRuntime & {
	getConfig<Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	): Output;
};

export function createConfigurationRuntime(
	contributions: readonly ConfigurationContribution[],
): ConfigurationRuntime {
	const resolver = createConfigurationResolver(contributions);
	return {
		...identityRuntime(),
		getConfig(provider) {
			return resolver.getConfig(provider);
		},
	};
}
