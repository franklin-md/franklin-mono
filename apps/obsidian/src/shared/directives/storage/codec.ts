import type { Codec } from '@franklin/lib';
import { z } from 'zod';
import type { DirectiveDocument } from './types.js';

const schema = z.object({
	version: z.literal(1),
	instances: z.record(
		z.uuid(),
		z.object({ name: z.string().regex(/^[a-z][a-z0-9-]*$/), state: z.json() }),
	),
});

export const directiveCodec: Codec<DirectiveDocument> = {
	encode: (value) => schema.parse(value),
	decode(raw) {
		const result = schema.safeParse(raw);
		return result.success
			? { ok: true, value: result.data }
			: {
					ok: false,
					issue: { kind: 'envelope-invalid', error: result.error.message },
				};
	},
};
