import { zodCodec } from '@franklin/lib';
import { z } from 'zod';

export const directiveName = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const directiveState = z.json();

const schema = z.object({
	version: z.literal(1),
	instances: z.record(
		z.uuid(),
		z.object({ name: directiveName, state: directiveState }),
	),
});

export type DirectiveState = z.infer<typeof directiveState>;
export type DirectiveDocument = z.infer<typeof schema>;
export const directiveCodec = zodCodec(schema);
