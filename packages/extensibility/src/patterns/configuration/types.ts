import type { StaticSignature } from '../../api/types.js';
import type { ConfigurationCombine } from './combine.js';
import type { CONFIGURATION_REGISTRATION } from './internal.js';
import type { ConfigurationValue } from './value.js';

// Per-Configuration metadata hidden behind CONFIGURATION_INTERNALS.
export type ConfigurationInternals<Input, Output = Input> = {
	readonly id: symbol;
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};

// Internal extension-point surface. Authors reach it through Configuration.of
// and Configuration.compute, not by calling the symbol-keyed method directly.
export type ConfigurationRegistrationAPI = {
	readonly [CONFIGURATION_REGISTRATION]: (value: ConfigurationValue) => void;
};

export type ConfigurationSignature =
	StaticSignature<ConfigurationRegistrationAPI>;
