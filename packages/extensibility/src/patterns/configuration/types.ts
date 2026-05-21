import type { StaticSignature } from '../../api/types.js';
import type { Configuration } from './configuration.js';
import type { CONFIGURATION_REGISTRATION } from './internal.js';

export type ConfigurationCombine<Input, Output> = (
	values: readonly Input[],
) => Output;

export type ConfigurationInternals<Input, Output> = {
	readonly id: symbol;
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};

export type ConfigurationContribution<Input = any, Output = any> = {
	readonly configuration: Configuration<Input, Output>;
	readonly input: Input;
};

export type ConfigurationRegistrationAPI = {
	readonly [CONFIGURATION_REGISTRATION]: (
		contribution: ConfigurationContribution,
	) => void;
};

export type ConfigurationSignature =
	StaticSignature<ConfigurationRegistrationAPI>;

export type ConfigurationOptions<Input, Output> = {
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};
