import type { Ctx, CtxPatch } from '../types/context.js';
import type { Message } from '../types/message.js';

// ---------------------------------------------------------------------------
// Pure ctx mutation functions — work on both mutable Ctx and Immer Draft<Ctx>
// ---------------------------------------------------------------------------

/**
 * Apply a partial context update.
 *
 * `history` and `config` merge by property: any subfield present in the
 * patch replaces the current value; omitted subfields are preserved.
 * `tools` replaces the list wholesale.
 */
function applySetContext(ctx: Ctx, partial: CtxPatch): void {
	if (partial.history) ctx.history = { ...ctx.history, ...partial.history };
	if (partial.tools) ctx.tools = partial.tools;
	if (partial.config) ctx.config = { ...ctx.config, ...partial.config };
}

/**
 * Append a message to the context's history.
 */
function appendMessage(ctx: Ctx, message: Message): void {
	ctx.history.messages.push(message);
}

// ---------------------------------------------------------------------------
// CtxTracker — mutable holder for agent-side ctx state
// ---------------------------------------------------------------------------

/**
 * Tracks the evolving Ctx on the agent side.
 *
 * Used by both the session adapter (agent side) and ctxExtension
 * (client side) to keep ctx in sync with the actual conversation
 * state (user messages from prompt, response messages from update).
 */
export class CtxTracker {
	private ctx: Ctx = {
		history: { systemPrompt: '', messages: [] },
		tools: [],
		config: {},
	};

	onChange?: () => void;

	apply(partial: CtxPatch): void {
		applySetContext(this.ctx, partial);
		this.onChange?.();
	}

	append(message: Message): void {
		appendMessage(this.ctx, message);
		this.onChange?.();
	}

	get(): Ctx {
		return this.ctx;
	}
}
