import type { JsonValue, VersionedCodec } from '@franklin/lib';
import { z } from 'zod';
import type { StoreSnapshot } from './snapshot.js';
import type { StoreMetadata } from './types.js';

const json = z.json();

export function encodeStore(
	{ ref, sharing, schemaVersion }: StoreMetadata,
	value: JsonValue,
	codec?: VersionedCodec<JsonValue>,
): StoreSnapshot {
	if (!codec) {
		return {
			ref,
			sharing,
			value,
			...(schemaVersion === undefined ? {} : { schemaVersion }),
		};
	}

	const encoded = codec.encode(value);
	if (!Number.isSafeInteger(encoded.version) || encoded.version < 0) {
		throw new Error('Store schema versions must be non-negative safe integers');
	}
	return {
		ref,
		sharing,
		schemaVersion: encoded.version,
		// Codec payloads are unknown. Opt-in stores pay one JSON-schema traversal
		// per encode to reject values that persistence cannot represent safely.
		value: json.parse(encoded.data),
	};
}
