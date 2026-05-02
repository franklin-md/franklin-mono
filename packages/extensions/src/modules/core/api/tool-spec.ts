import type { z } from 'zod';

declare const __toolArgs: unique symbol;

/**
 * A branded object that pairs a tool name literal with its Zod-inferred
 * args type. Mirrors the StoreKey pattern: the phantom `TArgs` type is
 * attached via a unique symbol brand, giving consumers full type
 * inference without any runtime overhead.
 *
 * At runtime this is just `{ name, description, schema }`.
 */
export type ToolSpec<Name extends string = string, TArgs = unknown> = {
	readonly name: Name;
	readonly description: string;
	readonly schema: z.ZodType<TArgs>;
	readonly [__toolArgs]?: TArgs;
};

/**
 * Create a typed tool spec. Zero runtime overhead — returns
 * `{ name, description, schema }` branded at the type level only.
 */
export function toolSpec<Name extends string, TArgs>(
	name: Name,
	description: string,
	schema: z.ZodType<TArgs>,
): ToolSpec<Name, TArgs> {
	return { name, description, schema } as ToolSpec<Name, TArgs>;
}

/**
 * Extract the args type from a ToolSpec.
 */
export type ToolArgs<S> = S extends ToolSpec<string, infer T> ? T : never;
