import { Configuration, type ConfigurationSpec } from './configuration.js';

type ConfigurationCombine<Input, Output> = (values: readonly Input[]) => Output;

type ConfigurationOptions<Input, Output = Input> = {
	readonly name: string;
} & ([Output] extends [readonly Input[]]
	? { readonly combine?: ConfigurationCombine<Input, Output> }
	: { readonly combine: ConfigurationCombine<Input, Output> });

function collectInputs<Input>(values: readonly Input[]): readonly Input[] {
	return values;
}

function resolveConfigurationSpec<Input, Output>(
	options: ConfigurationOptions<Input, Output>,
): ConfigurationSpec<Input, Output> {
	const combine =
		options.combine ?? (collectInputs as ConfigurationCombine<Input, Output>);

	return Object.freeze({
		name: options.name,
		combine,
	});
}

export function createConfiguration<Input>(
	options: ConfigurationOptions<Input, readonly Input[]>,
): Configuration<Input, readonly Input[]>;
export function createConfiguration<Input, Output = Input>(
	options: ConfigurationOptions<Input, Output>,
): Configuration<Input, Output>;
export function createConfiguration<Input, Output = Input>(
	options:
		| ConfigurationOptions<Input, Output>
		| ConfigurationOptions<Input, readonly Input[]>,
): Configuration<Input, readonly Input[]> | Configuration<Input, Output> {
	if (options.combine === undefined) {
		return new Configuration<Input, readonly Input[]>(
			resolveConfigurationSpec(
				options as ConfigurationOptions<Input, readonly Input[]>,
			),
		);
	}

	return new Configuration<Input, Output>(
		resolveConfigurationSpec(options as ConfigurationOptions<Input, Output>),
	);
}
