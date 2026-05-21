import { createFacet } from '../facet.js';
import { createConfigurationModule } from '../module.js';
import type { ConfigurationRuntime } from '../runtime.js';

const _module = createConfigurationModule();
void _module.extensionPoint;
void _module.compiler;

declare const runtime: ConfigurationRuntime;

const _stringFacet = createFacet<string, string>({
	name: 'string',
	combine: (values) => values.join(''),
});
const _stringValue: string = runtime.config(_stringFacet);
// @ts-expect-error config returns the facet output type
const _numberValue: number = runtime.config(_stringFacet);

const _listFacet = createFacet<number>({
	name: 'numbers',
	combine: (values) => values,
});
const _listValue: readonly number[] = runtime.config(_listFacet);
// @ts-expect-error list facet output is readonly
const _mutableListValue: number[] = runtime.config(_listFacet);

void _stringValue;
void _numberValue;
void _listValue;
void _mutableListValue;
