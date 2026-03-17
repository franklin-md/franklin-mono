import { z } from 'zod';

/**
 * Converts a Zod schema to JSON Schema using Zod v4's built-in conversion.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
	return z.toJSONSchema(schema) as Record<string, unknown>;
}
