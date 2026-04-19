import type { SystemPromptHandler } from '../../api/handlers.js';
import type { SystemPrompt } from '../../api/system-prompt.js';

export interface SystemPromptAssembler {
	/**
	 * Run every handler against a context tied to its own fragment slot,
	 * then concatenate the non-empty fragments in handler registration
	 * order, separated by blank lines.
	 *
	 * A handler that does not call `setPart` leaves its fragment unchanged
	 * from the previous assemble() call. A handler that calls `setPart('')`
	 * clears its fragment (it will be filtered out of the output).
	 */
	assemble(): Promise<string>;
}

export function buildSystemPromptAssembler(
	handlers: SystemPromptHandler[],
): SystemPromptAssembler {
	const fragments: (string | undefined)[] = new Array(handlers.length).fill(
		undefined,
	);

	return {
		async assemble() {
			for (const [index, handler] of handlers.entries()) {
				const systemPrompt: SystemPrompt = {
					setPart(content) {
						fragments[index] = content;
					},
				};
				await handler(systemPrompt);
			}
			const parts: string[] = [];
			for (const fragment of fragments) {
				if (fragment) parts.push(fragment);
			}
			return parts.join('\n\n');
		},
	};
}
