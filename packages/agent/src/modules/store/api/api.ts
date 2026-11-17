import type { Signature } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { JsonValue, VersionedCodec } from '@franklin/lib';
import type { Sharing } from './sharing.js';
import type { StoreKey } from './key.js';

export interface StoreAPI {
	/** Omit the codec for unversioned, unvalidated persistence. */
	registerStore<X extends string, T extends JsonValue>(
		key: StoreKey<X, T>,
		initial: T,
		sharing: Sharing,
		codec?: VersionedCodec<T>,
	): void;
	registerStore<T extends JsonValue>(
		name: string,
		initial: T,
		sharing: Sharing,
		codec?: VersionedCodec<T>,
	): void;
}

export interface StoreSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: StoreAPI;
}
