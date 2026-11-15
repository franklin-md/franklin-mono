import type { Store } from '../types.js';
import type { Sharing } from '../sharing.js';
import type { JsonValue, VersionedCodec } from '@franklin/lib';

export type StoreMetadata = {
	ref: string;
	sharing: Sharing;
	schemaVersion?: number;
};

export type StoreEntry = StoreMetadata & {
	store: Store<unknown>;
	codec?: VersionedCodec<JsonValue>;
};

export type StoreRegistration = {
	name: string;
	initial: JsonValue;
	sharing: Sharing;
	codec?: VersionedCodec<JsonValue>;
};
