import type { Context, Usage } from '@franklin/mini-acp';
import type { UsageTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../state.js';
import type { ContextLedger } from './context-ledger.js';

/**
 * Internal core context ledger.
 *
 * AgentState separates the context Mini-ACP has actually acknowledged from the
 * context core wants to send next. A hydrated `SessionSnapshot` seeds the next
 * desired context; it is not treated as already sent, because a freshly restored
 * Mini-ACP agent starts with an empty `Context` until `setContext` succeeds.
 *
 * Today the dehydrated snapshot is close to the model-visible history Mini-ACP
 * has seen. Over time it may become a richer application history, including
 * compaction points or other checkpoints that are projected down into the next
 * Mini-ACP `Context` before a prompt.
 */
export interface AgentState {
	getAgentContext(): Context;
	getSnapshot(): SessionSnapshot;
	readonly contextLedger: ContextLedger;
	readonly usageTracker: UsageTracker;
	add(delta: Usage): void;
}
