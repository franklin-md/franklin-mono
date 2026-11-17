import type { JsonValue, VersionedCodec } from '@franklin/lib';
import { encodeStore } from './encode.js';
import type { StoreSnapshot } from './snapshot.js';

export function decodeStore(
	snapshot: StoreSnapshot,
	codec: VersionedCodec<JsonValue>,
): { value: JsonValue; snapshot: StoreSnapshot } {
	const version =
		snapshot.schemaVersion === undefined ? 0 : snapshot.schemaVersion;
	if (!Number.isSafeInteger(version) || version < 0) {
		throw new Error(
			'Stored schema version must be a non-negative safe integer',
		);
	}
	// Migrations are pure by contract. A detached input also protects the live
	// value if a buggy migration mutates its argument before failing.
	const result = codec.decode({
		version,
		data: structuredClone(snapshot.value),
	});
	if (!result.ok) throw new Error(JSON.stringify(result.issue));
	return {
		value: result.value,
		snapshot: encodeStore(snapshot, result.value, codec),
	};
}
