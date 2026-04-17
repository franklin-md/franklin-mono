import type { SystemPromptHandler } from '../../api/handlers.js';
import type { SystemPromptContext } from '../../api/system-prompt-context.js';

export interface SystemPromptAssembler {
	/**
	 * Run every handler against a context tied to its own fragment slot,
	 * then concatenate the base prompt and non-empty fragments in handler
	 * registration order, separated by blank lines.
	 *
	 * A handler that does not call `setPart` leaves its fragment unchanged
	 * from the previous assemble() call. A handler that calls `setPart('')`
	 * clears its fragment (it will be filtered out of the output).
	 */
	assemble(): Promise<string>;
}

export function buildSystemPromptAssembler(
	handlers: SystemPromptHandler[],
	basePrompt: string,
): SystemPromptAssembler {
	const fragments: (string | undefined)[] = new Array(handlers.length).fill(
		undefined,
	);

	return {
		async assemble() {
			for (const [index, handler] of handlers.entries()) {
				const ctx: SystemPromptContext = {
					setPart(content) {
						fragments[index] = content;
					},
				};
				await handler(ctx);
			}
			const parts: string[] = [];
			if (basePrompt) parts.push(basePrompt);
			for (const fragment of fragments) {
				if (fragment) parts.push(fragment);
			}
			return parts.join('\n\n');
		},
	};
}
