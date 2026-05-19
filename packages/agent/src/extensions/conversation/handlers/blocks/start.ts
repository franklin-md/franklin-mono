import type {
	AssistantBlock,
	BlockMetadata,
	ConversationTurn,
} from '../../types.js';

import { endBlock, endLastBlock } from './end.js';

// Caller supplies a kind discriminant and the kind-specific payload only;
// the primitive owns the clock. `Extract` narrows to a single variant, and
// `Omit` strips metadata + kind, so the payload type is exactly the fields
// the caller needs to provide (no excess-property gymnastics).
type Payload<K extends AssistantBlock['kind']> = Omit<
	Extract<AssistantBlock, { kind: K }>,
	keyof BlockMetadata | 'kind'
>;

/**
 * Push a fully-formed block onto the turn. Does not touch any trailing
 * block — callers that want the "close trailing before opening" path
 * should use startNewBlock.
 *
 * The optional `at` argument lets composers (startNewBlock) share one
 * timestamp with a paired end call (zero drift), and lets tests pin time.
 */
export function startBlock<K extends AssistantBlock['kind']>(
	turn: ConversationTurn,
	kind: K,
	payload: Payload<K>,
	at: number = Date.now(),
): Extract<AssistantBlock, { kind: K }> {
	const block = {
		kind,
		...payload,
		startedAt: at,
	} as Extract<AssistantBlock, { kind: K }>;
	turn.response.blocks.push(block);
	return block;
}

/**
 * Close the trailing block (if any is still open) and push a new block.
 *
 * Shares one clock reading between the close and the open so sequential
 * blocks meet at the same point on the timeline — the previous block's
 * `endedAt` equals the new block's `startedAt`, no drift.
 */
export function startNewBlock<K extends AssistantBlock['kind']>(
	turn: ConversationTurn,
	kind: K,
	payload: Payload<K>,
): Extract<AssistantBlock, { kind: K }> {
	const now = Date.now();
	endLastBlock(turn, now);
	return startBlock(turn, kind, payload, now);
}

/**
 * Push an instantaneous block: close the trailing open block, start a
 * new one, and end it at the same moment. Used for point-in-time events
 * (turnEnd, tool-result with no matching call).
 *
 * startedAt === endedAt on the returned block.
 */
export function startAndEndNewBlock<K extends AssistantBlock['kind']>(
	turn: ConversationTurn,
	kind: K,
	payload: Payload<K>,
): Extract<AssistantBlock, { kind: K }> {
	const block = startNewBlock(turn, kind, payload);
	endBlock(block, block.startedAt);
	return block;
}
