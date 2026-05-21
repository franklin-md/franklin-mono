import type { Extension } from '../../../extension/types.js';
import { createFacet } from '../facet.js';
import type { ConfigurationRegistrationAPI, Facet } from '../types.js';

declare function readFacet<Input, Output>(facet: Facet<Input, Output>): Output;

// @ts-expect-error facet options are required
createFacet<string>();

const _listFacet = createFacet<string>({
	name: 'list',
	combine: (values) => values,
});
const _listFacetType: Facet<string, readonly string[]> = _listFacet;
const _listOutput = readFacet(_listFacet);
const _readonlyValues: readonly string[] = _listOutput;
// @ts-expect-error list facet output is readonly
const _mutableValues: string[] = _listOutput;

const _customFacet = createFacet<string, string>({
	name: 'custom',
	combine: (values) => values.join('\n'),
});
const _customFacetType: Facet<string, string> = _customFacet;
const _customOutput: string = readFacet(_customFacet);
// @ts-expect-error custom facet output is not the default input list
const _customList: readonly string[] = readFacet(_customFacet);

const _extension: Extension<ConfigurationRegistrationAPI> =
	_customFacet.of('value');
// @ts-expect-error facet input type is enforced
_customFacet.of(123);

void _listFacetType;
void _readonlyValues;
void _mutableValues;
void _customFacetType;
void _customOutput;
void _customList;
void _extension;
