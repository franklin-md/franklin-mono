import type { Codec } from './types.js';

/** Identity codec — no validation. For state shapes too dynamic to schema. */
export function rawCodec<T>(): Codec<T> {
	return {
		encode(value) {
			return value;
		},
		decode(raw) {
			return { ok: true, value: raw as T };
		},
	};
}
