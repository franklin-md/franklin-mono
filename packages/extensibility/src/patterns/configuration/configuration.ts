import type { Extension } from '../../extension/types.js';
import { CONFIGURATION_API } from './internal.js';
import type { ConfigurationAPI } from './types.js';

type ConfigurationCombine<Input, Output> = (values: readonly Input[]) => Output;

export type ConfigurationSpec<Input, Output = Input> = {
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};

export type ConfigurationReader = {
	getConfig<Input, Output>(configuration: Configuration<Input, Output>): Output;
};

export type ConfigurationCompute<Input> = (
	reader: ConfigurationReader,
) => Input;

export class Configuration<Input, Output = Input> {
	readonly spec: ConfigurationSpec<Input, Output>;

	constructor(spec: ConfigurationSpec<Input, Output>) {
		this.spec = Object.freeze({
			name: spec.name,
			combine: spec.combine,
		});
	}

	get name(): string {
		return this.spec.name;
	}

	combine(inputs: readonly Input[]): Output {
		return this.spec.combine(inputs);
	}

	of(input: Input): Extension<ConfigurationAPI> {
		return (api) => {
			api[CONFIGURATION_API]({
				kind: 'static',
				configuration: this,
				input,
			});
		};
	}

	compute(
		dependencies: readonly Configuration<any, any>[],
		compute: ConfigurationCompute<Input>,
	): Extension<ConfigurationAPI> {
		return (api) => {
			api[CONFIGURATION_API]({
				kind: 'computed',
				configuration: this,
				dependencies,
				compute,
			});
		};
	}
}
