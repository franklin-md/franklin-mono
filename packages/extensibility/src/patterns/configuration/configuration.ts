import type { Extension } from '../../extension/types.js';
import { CONFIGURATION_API } from './internal.js';
import type { ConfigurationAPI } from './types.js';

export type ConfigurationCombine<Input, Output> = (
	values: readonly Input[],
) => Output;

export type Configuration<Input, Output = Input> = {
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};

export type ConfigurationReader = {
	getConfig<Input, Output>(
		provider: ConfigurationProvider<Input, Output>,
	): Output;
};

export type ConfigurationCompute<Input> = (
	reader: ConfigurationReader,
) => Input;

export class ConfigurationProvider<Input, Output = Input> {
	readonly configuration: Configuration<Input, Output>;

	constructor(configuration: Configuration<Input, Output>) {
		this.configuration = Object.freeze({
			name: configuration.name,
			combine: configuration.combine,
		});
	}

	get name(): string {
		return this.configuration.name;
	}

	of(input: Input): Extension<ConfigurationAPI> {
		return (api) => {
			api[CONFIGURATION_API]({
				kind: 'static',
				provider: this,
				input,
			});
		};
	}

	compute(
		dependencies: readonly ConfigurationProvider<any, any>[],
		compute: ConfigurationCompute<Input>,
	): Extension<ConfigurationAPI> {
		return (api) => {
			api[CONFIGURATION_API]({
				kind: 'computed',
				provider: this,
				dependencies,
				compute,
			});
		};
	}
}
