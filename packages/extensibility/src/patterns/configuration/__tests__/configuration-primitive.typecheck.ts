import type { Extension } from '../../../extension/types.js';
import { Configuration, type ConfigurationSpec } from '../configuration.js';
import type { ConfigurationAPI } from '../types.js';

declare function readConfiguration<Input, Output>(
	configuration: Configuration<Input, Output>,
): Output;

// @ts-expect-error configuration requires a spec
new Configuration<string>();

const _listSpec: ConfigurationSpec<string> = {
	name: 'list',
	combine: (values) => values.at(-1) ?? 'fallback',
};
const _listConfiguration = new Configuration(_listSpec);
const _defaultConfigurationSpecType: ConfigurationSpec<string, string> =
	_listSpec;
const _defaultOutput = readConfiguration(_listConfiguration);
const _defaultValue: string = _defaultOutput;
// @ts-expect-error default output is the input type, not an input list
const _readonlyValues: readonly string[] = _defaultOutput;

const _listOutputConfiguration = new Configuration<string, readonly string[]>({
	name: 'listOutput',
	combine: (values) => values,
});
const _listOutput = readConfiguration(_listOutputConfiguration);
const _readonlyListValues: readonly string[] = _listOutput;
// @ts-expect-error list configuration output is readonly
const _mutableValues: string[] = _listOutput;

const _customConfiguration = new Configuration<string, string>({
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
void _customConfigurationSpecType;
void _customOutput;
void _customList;
void _extension;
void _computedExtension;
