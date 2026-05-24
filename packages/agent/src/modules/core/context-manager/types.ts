import type { Context } from '@franklin/mini-acp';
import type { ContextRecorder, UsageTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../state.js';
import type { ContextLedger } from './ledger/index.js';

/**
 * Internal core context ledger.
 *
 * ContextManager separates the context most recently sent to Mini-ACP from the
 * context core wants to send next. A hydrated `SessionSnapshot` seeds the next
 * desired context; it is not treated as already sent, because a freshly restored
 * Mini-ACP agent starts with an empty `Context` until `setContext` succeeds.
 *
 * Today the dehydrated snapshot is close to the model-visible history Mini-ACP
 * has seen. Over time it may become a richer application history, including
 * compaction points or other checkpoints that are projected down into the next
 * Mini-ACP `Context` before a prompt.
 */
export interface ContextManager {
	// Currently just used for the inspect => May not be the right shape.
	getAgentContext(): Context;
	getSnapshot(): SessionSnapshot;
	readonly contextLedger: ContextLedger;
	readonly contextRecorder: ContextRecorder;
	readonly usageTracker: UsageTracker;
}
