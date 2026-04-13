// ---------------------------------------------------------------------------
// Spec points
//
// Each point is a predicate over a Transcript that returns pass/fail/skip.
// IDs match the Spec Table in README.md.
// ---------------------------------------------------------------------------

import type { Expectation } from './types.js';
import { sends, receives } from './assertions/filters.js';
import { match } from './assertions/match.js';
import { initCompletedIndex } from './assertions/init.js';
import {
	isTurnActiveAt,
	nextReceiveAfter,
	promptIsRejected,
	promptStartsTurn,
	turns,
} from './assertions/turn-state.js';
import { StopCode, VALID_STOP_CODES } from '../types/stop-code.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

const initSendExists: Expectation = {
	id: 'init-send-exists',
	description: 'initialize send must exist',
	test: (t) => (sends(t, 'initialize').length > 0 ? 'pass' : 'fail'),
};

const initReceiveExists: Expectation = {
	id: 'init-receive-exists',
	description: 'Agent must respond to initialize',
	test: (t) => {
		if (sends(t, 'initialize').length === 0) return 'skip';
		return receives(t, 'initialize').length > 0 ? 'pass' : 'fail';
	},
};

const initIsFirst: Expectation = {
	id: 'init-is-first',
	description: 'initialize must be the first message sent',
	test: (t) => {
		const firstSend = t.find((e) => e.direction === 'send');
		if (!firstSend) return 'skip';
		return firstSend.method === 'initialize' ? 'pass' : 'fail';
	},
};

const initExactlyOnce: Expectation = {
	id: 'init-exactly-once',
	description: 'initialize must be sent exactly once',
	test: (t) => (sends(t, 'initialize').length === 1 ? 'pass' : 'fail'),
};

// ---------------------------------------------------------------------------
// Context Setup
// ---------------------------------------------------------------------------

const ctxBeforeFirstPrompt: Expectation = {
	id: 'ctx-before-first-prompt',
	description: 'setContext must precede the first prompt',
	test: (t) => {
		const promptIdx = t.findIndex((e) => match(e, 'send', 'prompt'));
		if (promptIdx === -1) return 'skip';
		const ctxIdx = t.findIndex((e) => match(e, 'send', 'setContext'));
		return ctxIdx !== -1 && ctxIdx < promptIdx ? 'pass' : 'fail';
	},
};

const ctxReceiveExists: Expectation = {
	id: 'ctx-receive-exists',
	description: 'Agent must respond to each setContext',
	test: (t) => {
		const sent = sends(t, 'setContext').length;
		if (sent === 0) return 'skip';
		return receives(t, 'setContext').length === sent ? 'pass' : 'fail';
	},
};

const ctxAfterInit: Expectation = {
	id: 'ctx-after-init',
	description: 'setContext must not be sent before initialize completes',
	test: (t) => {
		const ctxSends = sends(t, 'setContext');
		if (ctxSends.length === 0) return 'skip';
		const initDone = initCompletedIndex(t);
		if (initDone === -1) return 'fail';
		const firstCtx = ctxSends[0];
		if (!firstCtx) return 'fail';
		const firstCtxIdx = t.indexOf(firstCtx);
		return firstCtxIdx > initDone ? 'pass' : 'fail';
	},
};

// ---------------------------------------------------------------------------
// Turn Lifecycle
// ---------------------------------------------------------------------------

const turnEndsWithTurnEnd: Expectation = {
	id: 'turn-ends-with-turn-end',
	description:
		'Every prompt that starts a turn must eventually be followed by a turnEnd',
	test: (t) => {
		const prompts = sends(t, 'prompt');
		if (prompts.length === 0) return 'skip';
		for (const p of prompts) {
			const pIdx = t.indexOf(p);
			if (!promptStartsTurn(t, pIdx)) continue;
			const hasTurnEnd = t
				.slice(pIdx)
				.some((e) => match(e, 'receive', 'turnEnd'));
			if (!hasTurnEnd) return 'fail';
		}
		return 'pass';
	},
};

const noOverlappingPrompts: Expectation = {
	id: 'no-overlapping-prompts',
	description:
		'prompt sent during an active turn must be rejected and must not start a second turn',
	test: (t) => {
		const prompts = sends(t, 'prompt');
		if (prompts.length < 2) return 'skip';
		for (const promptEntry of prompts) {
			const pIdx = t.indexOf(promptEntry);
			if (!isTurnActiveAt(t, pIdx)) continue;
			if (!promptIsRejected(t, pIdx)) return 'fail';

			for (let i = pIdx + 1; i < t.length; i++) {
				const e = t[i];
				if (!e || e.direction !== 'receive') continue;
				if (e.method === 'turnEnd') break;
				if (e.method === 'turnStart') return 'fail';
			}
		}
		return 'pass';
	},
};

const promptAfterInit: Expectation = {
	id: 'prompt-after-init',
	description: 'prompt must not be sent before initialize completes',
	test: (t) => {
		const prompts = sends(t, 'prompt');
		if (prompts.length === 0) return 'skip';
		const initDone = initCompletedIndex(t);
		if (initDone === -1) return 'fail';
		const firstPrompt = prompts[0];
		if (!firstPrompt) return 'fail';
		const firstPromptIdx = t.indexOf(firstPrompt);
		return firstPromptIdx > initDone ? 'pass' : 'fail';
	},
};

const turnEndIsTerminal: Expectation = {
	id: 'turn-end-is-terminal',
	description: 'No stream events (chunk, update) after turnEnd within a turn',
	test: (t) => {
		const allTurns = turns(t);
		if (allTurns.length === 0) return 'skip';
		for (const turn of allTurns) {
			const turnEndIdx = turn.findIndex((e) => match(e, 'receive', 'turnEnd'));
			if (turnEndIdx === -1) continue;
			const afterTurnEnd = turn.slice(turnEndIdx + 1);
			if (
				afterTurnEnd.some(
					(e) => match(e, 'receive', 'chunk') || match(e, 'receive', 'update'),
				)
			)
				return 'fail';
		}
		return 'pass';
	},
};

const turnStartsWithTurnStart: Expectation = {
	id: 'turn-starts-with-turn-start',
	description:
		'The first stream event after every prompt sent while idle must be a turnStart',
	test: (t) => {
		const prompts = sends(t, 'prompt');
		if (prompts.length === 0) return 'skip';
		for (const p of prompts) {
			const pIdx = t.indexOf(p);
			if (isTurnActiveAt(t, pIdx)) continue;
			const nextReceive = nextReceiveAfter(t, pIdx);
			if (!nextReceive || nextReceive.method !== 'turnStart') return 'fail';
		}
		return 'pass';
	},
};

// ---------------------------------------------------------------------------
// Stream Events
// ---------------------------------------------------------------------------

const oneTurnEndPerTurn: Expectation = {
	id: 'one-turn-end-per-turn',
	description: 'Every turn has exactly one turnEnd',
	test: (t) => {
		const allTurns = turns(t);
		if (allTurns.length === 0) return 'skip';
		for (const turn of allTurns) {
			const count = turn.filter((e) => match(e, 'receive', 'turnEnd')).length;
			if (count !== 1) return 'fail';
		}
		return 'pass';
	},
};

const stopCodeValid: Expectation = {
	id: 'stop-code-valid',
	description: 'turnEnd.stopCode must be a valid StopCode enum value',
	test: (t) => {
		const turnEnds = receives(t, 'turnEnd');
		if (turnEnds.length === 0) return 'skip';
		for (const e of turnEnds) {
			if (!VALID_STOP_CODES.has(e.params.stopCode)) return 'fail';
		}
		return 'pass';
	},
};

const chunkHasMessageId: Expectation = {
	id: 'chunk-has-message-id',
	description: 'Every chunk has a messageId and role',
	test: (t) => {
		const chunks = receives(t, 'chunk');
		if (chunks.length === 0) return 'skip';
		for (const e of chunks) {
			if (e.params.messageId.length === 0 || e.params.role.length === 0)
				return 'fail';
		}
		return 'pass';
	},
};

const updateHasMessageId: Expectation = {
	id: 'update-has-message-id',
	description: 'Every update has a non-empty messageId',
	test: (t) => {
		const updates = receives(t, 'update');
		if (updates.length === 0) return 'skip';
		for (const e of updates) {
			if (!e.params.messageId || e.params.messageId.length === 0) return 'fail';
		}
		return 'pass';
	},
};

const updateHasMessage: Expectation = {
	id: 'update-has-message',
	description: 'Every update contains a complete message',
	test: (t) => {
		const updates = receives(t, 'update');
		if (updates.length === 0) return 'skip';
		for (const e of updates) {
			if (e.params.message.content.length === 0) return 'fail';
		}
		return 'pass';
	},
};

const chunkHasMatchingUpdate: Expectation = {
	id: 'chunk-has-matching-update',
	description:
		'Every chunk messageId must have a corresponding update with the same messageId',
	test: (t) => {
		const chunks = receives(t, 'chunk');
		if (chunks.length === 0) return 'skip';

		const updateMsgIds = new Set(
			receives(t, 'update').map((e) => e.params.messageId),
		);

		for (const c of chunks) {
			if (!updateMsgIds.has(c.params.messageId)) return 'fail';
		}
		return 'pass';
	},
};

const chunksPrecedeUpdate: Expectation = {
	id: 'chunks-precede-update',
	description: 'All chunks for a messageId precede the corresponding update',
	test: (t) => {
		const updates = receives(t, 'update');
		if (updates.length === 0) return 'skip';
		// Track messageIds whose update has already been emitted
		const closed = new Set<string>();
		for (const e of t) {
			if (match(e, 'receive', 'chunk')) {
				if (closed.has(e.params.messageId)) return 'fail';
			}
			if (match(e, 'receive', 'update')) {
				closed.add(e.params.messageId);
			}
		}
		return 'pass';
	},
};

const updateMessageMatchesChunks: Expectation = {
	id: 'update-message-matches-chunks',
	description:
		'If chunks exist for a messageId, the update text/thinking content is their concatenation',
	test: (t) => {
		const updates = receives(t, 'update');
		const chunks = receives(t, 'chunk');
		if (updates.length === 0 || chunks.length === 0) return 'skip';

		// Group chunks by messageId
		const chunksByMsgId = new Map<string, Array<(typeof chunks)[number]>>();
		for (const c of chunks) {
			const id = c.params.messageId;
			const arr = chunksByMsgId.get(id);
			if (arr) {
				arr.push(c);
			} else {
				chunksByMsgId.set(id, [c]);
			}
		}

		for (const u of updates) {
			const msgChunks = chunksByMsgId.get(u.params.messageId);
			if (!msgChunks || msgChunks.length === 0) continue;

			// Concatenate text chunk deltas
			const chunkedText = msgChunks
				.filter((c) => c.params.content.type === 'text')
				.map((c) => (c.params.content as { text: string }).text)
				.join('');

			const updateText = u.params.message.content
				.filter((b) => b.type === 'text')
				.map((b) => (b as { text: string }).text)
				.join('');

			if (chunkedText.length > 0 && chunkedText !== updateText) return 'fail';

			// Concatenate thinking chunk deltas
			const chunkedThinking = msgChunks
				.filter((c) => c.params.content.type === 'thinking')
				.map((c) => (c.params.content as { text: string }).text)
				.join('');

			const updateThinking = u.params.message.content
				.filter((b) => b.type === 'thinking')
				.map((b) => (b as { text: string }).text)
				.join('');

			if (chunkedThinking.length > 0 && chunkedThinking !== updateThinking)
				return 'fail';
		}

		return 'pass';
	},
};

// ---------------------------------------------------------------------------
// Tool Execution
// ---------------------------------------------------------------------------

const toolResultFollowsExecute: Expectation = {
	id: 'tool-result-follows-execute',
	description: 'Every toolExecute receive is followed by a toolResult send',
	test: (t) => {
		const executes = receives(t, 'toolExecute');
		if (executes.length === 0) return 'skip';
		for (const ex of executes) {
			const exIdx = t.indexOf(ex);
			const hasResult = t
				.slice(exIdx + 1)
				.some((e) => match(e, 'send', 'toolResult'));
			if (!hasResult) return 'fail';
		}
		return 'pass';
	},
};

const toolResultIdMatches: Expectation = {
	id: 'tool-result-id-matches',
	description:
		"toolResult.toolCallId must match the preceding toolExecute's call.id",
	test: (t) => {
		const executes = receives(t, 'toolExecute');
		if (executes.length === 0) return 'skip';
		for (const ex of executes) {
			const exIdx = t.indexOf(ex);
			const result = t
				.slice(exIdx + 1)
				.find((e) => match(e, 'send', 'toolResult'));
			if (!result) return 'fail';
			if (!match(result, 'send', 'toolResult')) return 'fail';
			if (result.params.toolCallId !== ex.params.call.id) return 'fail';
		}
		return 'pass';
	},
};

const toolExecuteDuringTurn: Expectation = {
	id: 'tool-execute-during-turn',
	description: 'toolExecute only occurs during an active turn',
	test: (t) => {
		const executes = receives(t, 'toolExecute');
		if (executes.length === 0) return 'skip';
		for (const ex of executes) {
			const idx = t.indexOf(ex);
			if (!isTurnActiveAt(t, idx)) return 'fail';
		}
		return 'pass';
	},
};

const toolNameInContext: Expectation = {
	id: 'tool-name-in-context',
	description: 'Invoked tool name must exist in a prior setContext tools array',
	test: (t) => {
		const executes = receives(t, 'toolExecute');
		if (executes.length === 0) return 'skip';
		const currentTools = new Set<string>();
		for (const e of t) {
			if (match(e, 'send', 'setContext')) {
				const tools = e.params.tools;
				if (tools) {
					currentTools.clear();
					for (const tool of tools) currentTools.add(tool.name);
				}
			}
			if (match(e, 'receive', 'toolExecute')) {
				if (!currentTools.has(e.params.call.name)) return 'fail';
			}
		}
		return 'pass';
	},
};

// ---------------------------------------------------------------------------
// Message Content
// ---------------------------------------------------------------------------

const userContentTypes: Expectation = {
	id: 'user-content-types',
	description: 'User messages may only contain text and image content blocks',
	test: (t) => {
		const prompts = sends(t, 'prompt');
		if (prompts.length === 0) return 'skip';
		const allowed = new Set(['text', 'image']);
		for (const e of prompts) {
			for (const block of e.params.content) {
				if (!allowed.has(block.type)) return 'fail';
			}
		}
		return 'pass';
	},
};

const assistantContentTypes: Expectation = {
	id: 'assistant-content-types',
	description:
		'Assistant stream updates may only contain text, thinking, image blocks',
	test: (t) => {
		const assistantUpdates = receives(t, 'update').filter(
			(e) => e.params.message.role === 'assistant',
		);
		if (assistantUpdates.length === 0) return 'skip';
		const allowed = new Set(['text', 'thinking', 'image']);
		for (const e of assistantUpdates) {
			for (const block of e.params.message.content) {
				if (!allowed.has(block.type)) return 'fail';
			}
		}
		return 'pass';
	},
};

const toolResultContentTypes: Expectation = {
	id: 'tool-result-content-types',
	description:
		'toolResult messages may only contain text and image content blocks',
	test: (t) => {
		const results = sends(t, 'toolResult');
		if (results.length === 0) return 'skip';
		const allowed = new Set(['text', 'image']);
		for (const e of results) {
			for (const block of e.params.content) {
				if (!allowed.has(block.type)) return 'fail';
			}
		}
		return 'pass';
	},
};

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

const cancelDuringActiveTurn: Expectation = {
	id: 'cancel-during-active-turn',
	description: 'cancel must only be sent during an active turn',
	test: (t) => {
		const cancels = sends(t, 'cancel');
		if (cancels.length === 0) return 'skip';
		for (const c of cancels) {
			const idx = t.indexOf(c);
			if (!isTurnActiveAt(t, idx)) return 'fail';
		}
		return 'pass';
	},
};

const cancelStopCode: Expectation = {
	id: 'cancel-stop-code',
	description:
		'After cancel, the turn should end with stopCode: Cancelled (101)',
	test: (t) => {
		const cancels = sends(t, 'cancel');
		if (cancels.length === 0) return 'skip';
		for (const c of cancels) {
			const cIdx = t.indexOf(c);
			const turnEnd = t
				.slice(cIdx + 1)
				.find((e) => match(e, 'receive', 'turnEnd'));
			if (!turnEnd) return 'skip';
			if (!match(turnEnd, 'receive', 'turnEnd')) return 'fail';
			if (turnEnd.params.stopCode !== StopCode.Cancelled) return 'fail';
		}
		return 'pass';
	},
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const specPoints: Expectation[] = [
	// Initialization
	initSendExists,
	initReceiveExists,
	initIsFirst,
	initExactlyOnce,
	// Context Setup
	ctxBeforeFirstPrompt,
	ctxReceiveExists,
	ctxAfterInit,
	// Turn Lifecycle
	turnStartsWithTurnStart,
	turnEndsWithTurnEnd,
	noOverlappingPrompts,
	promptAfterInit,
	turnEndIsTerminal,
	// Stream Events
	oneTurnEndPerTurn,
	stopCodeValid,
	chunkHasMessageId,
	updateHasMessageId,
	updateHasMessage,
	chunkHasMatchingUpdate,
	chunksPrecedeUpdate,
	updateMessageMatchesChunks,
	// Tool Execution
	toolResultFollowsExecute,
	toolResultIdMatches,
	toolExecuteDuringTurn,
	toolNameInContext,
	// Message Content
	userContentTypes,
	assistantContentTypes,
	toolResultContentTypes,
	// Cancellation
	cancelDuringActiveTurn,
	cancelStopCode,
];
