import { Configuration } from '../configuration.js';
import { createConfigurationModule } from '../module.js';
import type { ConfigurationRuntime } from '../runtime.js';

const _module = createConfigurationModule();
void _module.extensionPoint;
void _module.compiler;

declare const runtime: ConfigurationRuntime;

const _stringConfiguration = new Configuration<string, string>({
	name: 'string',
	combine: (values) => values.join(''),
});
const _stringValue: string = runtime.config(_stringConfiguration);
// @ts-expect-error config returns the configuration output type
const _numberValue: number = runtime.config(_stringConfiguration);

const _listConfiguration = new Configuration<number>({
	name: 'numbers',
	combine: (values) => values,
});
const _listValue: readonly number[] = runtime.config(_listConfiguration);
// @ts-expect-error list configuration output is readonly
const _mutableListValue: number[] = runtime.config(_listConfiguration);

void _stringValue;
void _numberValue;
void _listValue;
void _mutableListValue;
