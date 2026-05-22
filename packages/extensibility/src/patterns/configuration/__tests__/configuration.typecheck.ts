import { createConfiguration } from '../create.js';
import { createConfigurationModule } from '../module.js';
import type { ConfigurationRuntime } from '../runtime.js';

const _module = createConfigurationModule();
void _module.extensionPoint;
void _module.compiler;

declare const runtime: ConfigurationRuntime;

const _stringConfiguration = createConfiguration<string, string>({
	name: 'string',
	combine: (values) => values.join(''),
});
const _stringValue: string = runtime.getConfig(_stringConfiguration);
// @ts-expect-error getConfig returns the configuration output type
const _numberValue: number = runtime.getConfig(_stringConfiguration);

const _defaultOutputConfiguration = createConfiguration<number>({
	name: 'numbers',
	combine: (values) => values.at(-1) ?? 0,
});
const _defaultOutputValue: number = runtime.getConfig(
	_defaultOutputConfiguration,
);
// @ts-expect-error default configuration output matches the input type
const _defaultOutputListValue: readonly number[] = runtime.getConfig(
	_defaultOutputConfiguration,
);

const _listConfiguration = createConfiguration<number, readonly number[]>({
	name: 'numberList',
	combine: (values) => values,
});
const _listValue: readonly number[] = runtime.getConfig(_listConfiguration);
// @ts-expect-error list configuration output is readonly
const _mutableListValue: number[] = runtime.getConfig(_listConfiguration);

const _computedExtension = _stringConfiguration.compute(
	[_defaultOutputConfiguration],
	(reader) => reader.getConfig(_defaultOutputConfiguration).toString(),
);
// @ts-expect-error computed values must return the configuration input type
_stringConfiguration.compute([], () => 123);

void _stringValue;
void _numberValue;
void _defaultOutputValue;
void _defaultOutputListValue;
void _listValue;
void _mutableListValue;
void _computedExtension;
