import type { z } from 'zod';
import type { ExtensionToolDefinition } from '../core/tool.js';
import type { ContentBlockResult } from '../core/content-block.js';

/**
 * Minimal shape of a Pi ToolDefinition — just what we need for bridging.
 * Avoids importing the full Pi types into our public API surface.
 *
 * Uses `unknown` for signal/onUpdate/ctx because Pi's concrete types
 * (AgentToolUpdateCallback, ExtensionContext) accept `undefined` at
 * runtime even though the type declarations are non-optional.
 */
interface PiToolLike {
	name: string;
	description: string;
	execute(
		toolCallId: string,
		params: unknown,
		signal: unknown,
		onUpdate: unknown,
		ctx: unknown,
	): Promise<{
		content: Array<{
			type: string;
			text?: string;
			data?: string;
			mimeType?: string;
		}>;
	}>;
}

/**
 * Bridge a Pi ToolDefinition to a Franklin ExtensionToolDefinition.
 *
 * We provide a parallel Zod schema since Pi uses TypeBox internally.
 * The schemas are structurally identical (simple flat objects).
 */
export function bridgePiToolDefinition<TInput>(
	piTool: PiToolLike,
	zodSchema: z.ZodType<TInput>,
): ExtensionToolDefinition<TInput, ContentBlockResult> {
	return {
		name: piTool.name,
		description: piTool.description,
		schema: zodSchema,
		async execute(params: TInput): Promise<ContentBlockResult> {
			const result = await piTool.execute(
				crypto.randomUUID(),
				params,
				undefined,
				undefined,
				undefined,
			);
			return {
				content: result.content as ContentBlockResult['content'],
			};
		},
	};
}
