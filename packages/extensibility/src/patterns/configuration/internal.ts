import type { Configuration } from './configuration.js';
import type { ConfigurationInternals } from './types.js';

export const CONFIGURATION_INTERNALS: unique symbol = Symbol(
	'franklin.configuration.internals',
);

export const CONFIGURATION_REGISTRATION: unique symbol = Symbol(
	'franklin.configuration.registration',
);

export function getConfigurationInternals<Input, Output>(
	configuration: Configuration<Input, Output>,
): ConfigurationInternals<Input, Output> {
	return configuration[CONFIGURATION_INTERNALS];
}
