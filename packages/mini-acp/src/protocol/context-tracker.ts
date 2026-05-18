import type { Context, ContextPatch } from '../types/context.js';
import type { Message } from '../types/message.js';

// ---------------------------------------------------------------------------
// Pure context mutation functions — work on both mutable Context and Immer Draft<Context>
// ---------------------------------------------------------------------------

/**
 * Apply a partial context update.
 *
 * `history` and `config` merge by property: any subfield present in the
 * patch replaces the current value; omitted subfields are preserved.
 * `tools` replaces the list wholesale.
 */
function applySetContext(context: Context, partial: ContextPatch): void {
	if (partial.history !== undefined)
		context.history = { ...context.history, ...partial.history };
	if (partial.tools !== undefined) context.tools = partial.tools;
	if (partial.config !== undefined)
		context.config = { ...context.config, ...partial.config };
}

/**
 * Append a message to the context's history.
 */
function appendMessage(context: Context, message: Message): void {
	context.history.messages.push(message);
}

function createEmptyContext(): Context {
	return {
		history: { systemPrompt: '', messages: [] },
		tools: [],
		config: {},
	};
}

// ---------------------------------------------------------------------------
// ContextTracker — mutable holder for agent-side context state
// ---------------------------------------------------------------------------

/**
 * Tracks the evolving Context on the agent side.
 *
 * Used by both the session adapter (agent side) and context extension
 * (client side) to keep context in sync with the actual conversation
 * state (user messages from prompt, response messages from update).
 */
export class ContextTracker {
	private context: Context = createEmptyContext();

	onChange?: () => void;

	apply(partial: ContextPatch): void {
		applySetContext(this.context, partial);
		this.onChange?.();
	}

	append(message: Message): void {
		appendMessage(this.context, message);
		this.onChange?.();
	}

	reset(): void {
		this.context = createEmptyContext();
		this.onChange?.();
	}

	get(): Context {
		return this.context;
	}
}
