import { Configuration, type ConfigurationSpec } from './configuration.js';

type ConfigurationCombine<Input, Output> = (values: readonly Input[]) => Output;

type NamedConfigurationOptions = {
	readonly name: string;
};

type CollectedConfigurationOptions = NamedConfigurationOptions & {
	readonly combine?: undefined;
};

type ConfigurationOptions<Input, Output = Input> = {
	readonly name: string;
	readonly combine: ConfigurationCombine<Input, Output>;
};

function collectInputs<Input>(values: readonly Input[]): readonly Input[] {
	return values;
}

function resolveConfigurationSpec<Input, Output>(
	options: ConfigurationOptions<Input, Output>,
): ConfigurationSpec<Input, Output> {
	return Object.freeze({
		name: options.name,
		combine: options.combine,
	});
}

export function createConfiguration<Input, Output = Input>(
	options: ConfigurationOptions<Input, Output>,
): Configuration<Input, Output>;
export function createConfiguration<Input>(
	options: CollectedConfigurationOptions,
): Configuration<Input, readonly Input[]>;
export function createConfiguration<Input, Output = Input>(
	options: CollectedConfigurationOptions | ConfigurationOptions<Input, Output>,
): Configuration<Input, readonly Input[]> | Configuration<Input, Output> {
	if (options.combine === undefined) {
		return new Configuration<Input, readonly Input[]>(
			resolveConfigurationSpec({
				name: options.name,
				combine: collectInputs,
			}),
		);
	}

	return new Configuration<Input, Output>(resolveConfigurationSpec(options));
}
