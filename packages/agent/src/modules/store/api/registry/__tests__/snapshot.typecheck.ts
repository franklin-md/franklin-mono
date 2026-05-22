import type { JsonValue } from '@franklin/lib';
import type { StoreSnapshot } from '../snapshot.js';

type ExpectJson<T extends JsonValue> = T;
type _StoreSnapshotIsJson = ExpectJson<StoreSnapshot>;

const _snapshot = {
	ref: 'store-ref',
	sharing: 'shared',
	value: {
		count: 1,
		nested: [true, null, 'value'],
	},
} satisfies StoreSnapshot;

const _json: JsonValue = _snapshot;

const _dateValue = {
	ref: 'store-ref',
	sharing: 'private',
	// @ts-expect-error persisted store values must be JSON, not object instances.
	value: new Date(),
} satisfies StoreSnapshot;

void (null as unknown as _StoreSnapshotIsJson);
void _json;
void _dateValue;
