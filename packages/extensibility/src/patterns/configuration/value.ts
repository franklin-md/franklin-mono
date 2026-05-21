import type { Configuration } from './configuration.js';
import type { ConfigurationCompute } from './reader.js';

// Static and computed providers share the same downstream pipeline: each
// resolves to one input for the target configuration's combine function.
export type StaticConfigurationValue<Input = any, Output = any> = {
	readonly kind: 'static';
	readonly configuration: Configuration<Input, Output>;
	readonly input: Input;
};

export type ComputedConfigurationValue<Input = any, Output = any> = {
	readonly kind: 'computed';
	readonly configuration: Configuration<Input, Output>;
	readonly dependencies: readonly Configuration<any, any>[];
	readonly compute: ConfigurationCompute<Input>;
};

export type ConfigurationValue<Input = any, Output = any> =
	| StaticConfigurationValue<Input, Output>
	| ComputedConfigurationValue<Input, Output>;
