import { zodToJsonSchema } from 'zod-to-json-schema';

import type { z } from 'zod';

/**
 * Converts a Zod schema to JSON Schema, casting through `unknown` to avoid
 * TypeScript's "excessively deep" type instantiation error that occurs when
 * zodToJsonSchema receives a `ZodType<any>`.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	return zodToJsonSchema(schema as any) as Record<string, unknown>;
}
