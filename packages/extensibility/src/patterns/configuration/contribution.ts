import type {
	ConfigurationCompute,
	ConfigurationProvider,
} from './configuration.js';

// Static and computed contributions share the same downstream pipeline: each
// resolves to one input value for the target configuration's combine function.
export type StaticConfigurationContribution<Input = any, Output = any> = {
	readonly kind: 'static';
	readonly provider: ConfigurationProvider<Input, Output>;
	readonly input: Input;
};

export type ComputedConfigurationContribution<Input = any, Output = any> = {
	readonly kind: 'computed';
	readonly provider: ConfigurationProvider<Input, Output>;
	readonly dependencies: readonly ConfigurationProvider<any, any>[];
	readonly compute: ConfigurationCompute<Input>;
};

export type ConfigurationContribution<Input = any, Output = any> =
	| StaticConfigurationContribution<Input, Output>
	| ComputedConfigurationContribution<Input, Output>;
