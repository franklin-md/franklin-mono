import { useCallback, useRef, useState } from 'react';

import type { ConversationTurn } from '@franklin/extensions';

import { useAgent } from '../agent/agent-context.js';
import { useConversationTurns } from '../conversation/use-conversation-turns.js';
import { getConversationTurnPhase } from '../conversation/turn-info/get-phase.js';

import { PromptProvider } from './context.js';

// `sending` is a function of the persistent conversation store: a turn is
// in flight iff the last turn has not yet received a `turnEnd` block. This
// survives switching the active conversation away and back — unlike a local
// useState, which a remount-on-focus parent would reset to false even when
// the agent is genuinely mid-turn.
function isLastTurnInProgress(turns: readonly ConversationTurn[]): boolean {
	const last = turns.at(-1);
	if (!last) return false;
	return getConversationTurnPhase(last) === 'in-progress';
}

/**
 * Headless prompt root. Owns input text state and the full send lifecycle.
 *
 * Calls `agent.prompt()` internally — must be used inside an `<AgentProvider>`.
 */
export function Prompt({ children }: { children: React.ReactNode }) {
	const agent = useAgent();
	const turns = useConversationTurns();
	const [input, setInput] = useState('');
	const sending = isLastTurnInProgress(turns.get());
	const canSend = !!input.trim() && !sending;

	// Ref to latest input so the send callback doesn't go stale.
	const inputRef = useRef(input);
	inputRef.current = input;

	const send = useCallback(() => {
		const text = inputRef.current.trim();
		if (!text || sending) return;

		setInput('');

		void (async () => {
			const stream = agent.prompt({
				role: 'user',
				content: [{ type: 'text', text }],
			});
			for await (const _event of stream) {
				/* drained — events handled by extensions via observers */
			}
		})();
	}, [agent, sending]);

	const cancel = useCallback(() => {
		void agent.cancel();
	}, [agent]);

	return (
		<PromptProvider value={{ input, setInput, sending, canSend, send, cancel }}>
			{children}
		</PromptProvider>
	);
}
