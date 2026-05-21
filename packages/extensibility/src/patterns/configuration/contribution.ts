import type { ConfigurationCompute, Configuration } from './configuration.js';

// Static and computed contributions share the same downstream pipeline: each
// resolves to one input value for the target configuration's combine function.
export type StaticConfigurationContribution<Input = any, Output = any> = {
	readonly kind: 'static';
	readonly configuration: Configuration<Input, Output>;
	readonly input: Input;
};

export type ComputedConfigurationContribution<Input = any, Output = any> = {
	readonly kind: 'computed';
	readonly configuration: Configuration<Input, Output>;
	readonly dependencies: readonly Configuration<any, any>[];
	readonly compute: ConfigurationCompute<Input>;
};

export type ConfigurationContribution<Input = any, Output = any> =
	| StaticConfigurationContribution<Input, Output>
	| ComputedConfigurationContribution<Input, Output>;
