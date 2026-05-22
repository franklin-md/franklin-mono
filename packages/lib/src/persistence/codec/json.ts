import type { JsonValue } from '../../json/index.js';
import type { Codec } from './types.js';

export function jsonCodec<T extends JsonValue>(): Codec<T> {
	return {
		encode(value) {
			return value;
		},
		decode(raw) {
			return { ok: true, value: raw as T };
		},
	};
}
