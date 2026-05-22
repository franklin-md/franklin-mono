import { jsonCodec } from '../../persistence/codec/json.js';
import type { JsonObject, JsonValue } from '../index.js';

const _primitive = 'value' satisfies JsonValue;
const _array = ['value', 1, true, null] satisfies JsonValue;
const _object = {
	name: 'Franklin',
	count: 1,
	flags: [true, false],
	nested: {
		value: null,
	},
} satisfies JsonObject;

jsonCodec<typeof _object>();

// @ts-expect-error undefined is not a JSON value; omit the key instead.
const _undefinedProperty = { value: undefined } satisfies JsonValue;

// @ts-expect-error functions are not JSON values.
const _functionProperty = { run() {} } satisfies JsonValue;

// @ts-expect-error Date instances are not JSON values.
jsonCodec<{ createdAt: Date }>();

void _primitive;
void _array;
void _object;
void _undefinedProperty;
void _functionProperty;
