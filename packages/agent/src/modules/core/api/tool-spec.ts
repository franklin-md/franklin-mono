import type { JsonValue } from '@franklin/lib';
import type { z } from 'zod';

declare const __toolArgs: unique symbol;
declare const __toolOutput: unique symbol;

/**
 * A branded object that pairs a tool name literal with its Zod-inferred
 * args type. Mirrors the StoreKey pattern: the phantom `TArgs` type is
 * attached via a unique symbol brand, giving consumers full type
 * inference without any runtime overhead.
 *
 * At runtime this is just `{ name, description, schema }`.
 */
export type ToolSpec<
	Name extends string = string,
	TArgs = unknown,
	TOutput extends JsonValue = JsonValue,
> = {
	readonly name: Name;
	readonly description: string;
	readonly schema: z.ZodType<TArgs>;
	readonly [__toolArgs]?: TArgs;
	readonly [__toolOutput]?: TOutput;
};

/**
 * Create a typed tool spec. Zero runtime overhead — returns
 * `{ name, description, schema }` branded at the type level only.
 */
export function toolSpec<
	Name extends string,
	TArgs,
	TOutput extends JsonValue = JsonValue,
>(
	name: Name,
	description: string,
	schema: z.ZodType<TArgs>,
): ToolSpec<Name, TArgs, TOutput> {
	return { name, description, schema };
}

/**
 * Extract the args type from a ToolSpec.
 */
export type ToolArgsOf<S> = S extends ToolSpec<string, infer T> ? T : never;

/**
 * Extract the raw output type from a ToolSpec.
 */
export type ToolOutputOf<S> =
	S extends ToolSpec<string, infer _TArgs, infer TOutput> ? TOutput : never;
