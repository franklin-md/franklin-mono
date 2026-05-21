import { ConfigurationProvider } from '../configuration.js';
import { createConfigurationModule } from '../module.js';
import type { ConfigurationRuntime } from '../runtime.js';

const _module = createConfigurationModule();
void _module.extensionPoint;
void _module.compiler;

declare const runtime: ConfigurationRuntime;

const _stringProvider = new ConfigurationProvider<string, string>({
	name: 'string',
	combine: (values) => values.join(''),
});
const _stringValue: string = runtime.getConfig(_stringProvider);
// @ts-expect-error getConfig returns the configuration output type
const _numberValue: number = runtime.getConfig(_stringProvider);

const _defaultOutputProvider = new ConfigurationProvider<number>({
	name: 'numbers',
	combine: (values) => values.at(-1) ?? 0,
});
const _defaultOutputValue: number = runtime.getConfig(_defaultOutputProvider);
// @ts-expect-error default configuration output matches the input type
const _defaultOutputListValue: readonly number[] = runtime.getConfig(
	_defaultOutputProvider,
);

const _listProvider = new ConfigurationProvider<number, readonly number[]>({
	name: 'numberList',
	combine: (values) => values,
});
const _listValue: readonly number[] = runtime.getConfig(_listProvider);
// @ts-expect-error list configuration output is readonly
const _mutableListValue: number[] = runtime.getConfig(_listProvider);

const _computedExtension = _stringProvider.compute(
	[_defaultOutputProvider],
	(reader) => reader.getConfig(_defaultOutputProvider).toString(),
);
// @ts-expect-error computed values must return the configuration input type
_stringProvider.compute([], () => 123);

void _stringValue;
void _numberValue;
void _defaultOutputValue;
void _defaultOutputListValue;
void _listValue;
void _mutableListValue;
void _computedExtension;
