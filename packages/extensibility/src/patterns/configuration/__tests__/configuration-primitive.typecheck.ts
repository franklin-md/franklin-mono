import type { Extension } from '../../../extension/types.js';
import type { Configuration, ConfigurationSpec } from '../configuration.js';
import { createConfiguration } from '../create.js';
import type { ConfigurationAPI } from '../types.js';

declare function readConfiguration<Input, Output>(
	configuration: Configuration<Input, Output>,
): Output;

// @ts-expect-error Configuration is a type; use createConfiguration to construct one
new Configuration<string>();

const _listSpec: ConfigurationSpec<string> = {
	name: 'list',
	combine: (values) => values.at(-1) ?? 'fallback',
};
const _listConfiguration = createConfiguration(_listSpec);
const _defaultConfigurationSpecType: ConfigurationSpec<string, string> =
	_listSpec;
const _defaultOutput = readConfiguration(_listConfiguration);
const _defaultValue: string = _defaultOutput;
// @ts-expect-error default output is the input type, not an input list
const _readonlyValues: readonly string[] = _defaultOutput;

const _listOutputConfiguration = createConfiguration<string, readonly string[]>(
	{
		name: 'listOutput',
		combine: (values) => values,
	},
);
const _listOutput = readConfiguration(_listOutputConfiguration);
const _readonlyListValues: readonly string[] = _listOutput;
// @ts-expect-error list configuration output is readonly
const _mutableValues: string[] = _listOutput;

const _collectedConfiguration = createConfiguration<string>({
	name: 'collected',
});
const _collectedOutput = readConfiguration(_collectedConfiguration);
const _collectedValues: readonly string[] = _collectedOutput;
// @ts-expect-error omitted combine returns the collected input list
const _collectedSingleValue: string = _collectedOutput;
_collectedConfiguration.of('value');
// @ts-expect-error collected configuration input type is enforced
_collectedConfiguration.of(123);
const _undefinedCombineConfiguration = createConfiguration<string>({
	name: 'undefinedCombine',
	combine: undefined,
});
const _undefinedCombineOutput = readConfiguration(
	_undefinedCombineConfiguration,
);
const _undefinedCombineValues: readonly string[] = _undefinedCombineOutput;
// @ts-expect-error undefined combine returns the collected input list
const _undefinedCombineSingleValue: string = _undefinedCombineOutput;
// @ts-expect-error omitted combine returns exactly readonly Input[], not a narrowed custom output
createConfiguration<string, readonly ['only']>({
	name: 'narrowedList',
});

const _explicitListSpec: ConfigurationSpec<string, readonly string[]> = {
	name: 'explicitList',
	combine: (values) => values,
};
const _explicitListConfiguration = createConfiguration<
	string,
	readonly string[]
>(_explicitListSpec);
const _explicitListOutput = readConfiguration(_explicitListConfiguration);
const _explicitListValues: readonly string[] = _explicitListOutput;

const _explicitListShorthand = createConfiguration<string>({
	name: 'explicitListShorthand',
});
const _explicitListShorthandOutput = readConfiguration(_explicitListShorthand);
const _explicitListShorthandValues: readonly string[] =
	_explicitListShorthandOutput;

const _customConfiguration = createConfiguration<string, string>({
	name: 'custom',
	combine: (values) => values.join('\n'),
});
const _customConfigurationSpecType: ConfigurationSpec<string, string> =
	_customConfiguration.spec;
const _customOutput: string = readConfiguration(_customConfiguration);
// @ts-expect-error custom configuration output is not the default input list
const _customList: readonly string[] = readConfiguration(_customConfiguration);

const _extension: Extension<ConfigurationAPI> =
	_customConfiguration.of('value');
// @ts-expect-error configuration input type is enforced
_customConfiguration.of(123);
const _computedExtension: Extension<ConfigurationAPI> =
	_customConfiguration.compute([_listConfiguration], (reader) =>
		reader.getConfig(_listConfiguration),
	);
// @ts-expect-error computed configuration input type is enforced
_customConfiguration.compute([], () => 123);

void _defaultConfigurationSpecType;
void _defaultValue;
void _readonlyValues;
void _listOutputConfiguration;
void _readonlyListValues;
void _mutableValues;
void _collectedValues;
void _collectedSingleValue;
void _undefinedCombineValues;
void _undefinedCombineSingleValue;
void _explicitListValues;
void _explicitListShorthandValues;
void _customConfigurationSpecType;
void _customOutput;
void _customList;
void _extension;
void _computedExtension;
