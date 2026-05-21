import type { Extension } from '../../../extension/types.js';
import { ConfigurationProvider, type Configuration } from '../configuration.js';
import type { ConfigurationAPI } from '../types.js';

declare function readConfiguration<Input, Output>(
	provider: ConfigurationProvider<Input, Output>,
): Output;

// @ts-expect-error provider requires a configuration
new ConfigurationProvider<string>();

const _listConfiguration: Configuration<string> = {
	name: 'list',
	combine: (values) => values.at(-1) ?? 'fallback',
};
const _listProvider = new ConfigurationProvider(_listConfiguration);
const _defaultConfigurationType: Configuration<string, string> =
	_listConfiguration;
const _defaultOutput = readConfiguration(_listProvider);
const _defaultValue: string = _defaultOutput;
// @ts-expect-error default output is the input type, not an input list
const _readonlyValues: readonly string[] = _defaultOutput;

const _listOutputProvider = new ConfigurationProvider<
	string,
	readonly string[]
>({
	name: 'listOutput',
	combine: (values) => values,
});
const _listOutput = readConfiguration(_listOutputProvider);
const _readonlyListValues: readonly string[] = _listOutput;
// @ts-expect-error list configuration output is readonly
const _mutableValues: string[] = _listOutput;

const _customProvider = new ConfigurationProvider<string, string>({
	name: 'custom',
	combine: (values) => values.join('\n'),
});
const _customConfigurationType: Configuration<string, string> =
	_customProvider.configuration;
const _customOutput: string = readConfiguration(_customProvider);
// @ts-expect-error custom configuration output is not the default input list
const _customList: readonly string[] = readConfiguration(_customProvider);

const _extension: Extension<ConfigurationAPI> = _customProvider.of('value');
// @ts-expect-error configuration input type is enforced
_customProvider.of(123);
const _computedExtension: Extension<ConfigurationAPI> = _customProvider.compute(
	[_listProvider],
	(reader) => reader.getConfig(_listProvider),
);
// @ts-expect-error computed configuration input type is enforced
_customProvider.compute([], () => 123);

void _defaultConfigurationType;
void _defaultValue;
void _readonlyValues;
void _listOutputProvider;
void _readonlyListValues;
void _mutableValues;
void _customConfigurationType;
void _customOutput;
void _customList;
void _extension;
void _computedExtension;
