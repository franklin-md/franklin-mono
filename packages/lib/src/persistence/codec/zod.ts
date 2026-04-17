import type { z } from 'zod';
import type { Codec } from './types.js';

/** Validates with a Zod schema. Wrap in `versioned()` for disk use. */
export function zodCodec<T>(schema: z.ZodType<T>): Codec<T> {
	return {
		encode(value) {
			return value;
		},
		decode(raw) {
			const res = schema.safeParse(raw);
			if (!res.success) {
				return {
					ok: false,
					issue: {
						kind: 'schema-mismatch',
						version: 0,
						error: res.error.message,
					},
				};
			}
			return { ok: true, value: res.data };
		},
	};
}
