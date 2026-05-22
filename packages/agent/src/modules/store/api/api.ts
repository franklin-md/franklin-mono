import type { Signature } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { JsonValue } from '@franklin/lib';
import type { Sharing } from './sharing.js';
import type { StoreKey } from './key.js';

export interface StoreAPI {
	registerStore<X extends string, T extends JsonValue>(
		key: StoreKey<X, T>,
		initial: T,
		sharing: Sharing,
	): void;
	registerStore(name: string, initial: JsonValue, sharing: Sharing): void;
}

export interface StoreSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: StoreAPI;
}
