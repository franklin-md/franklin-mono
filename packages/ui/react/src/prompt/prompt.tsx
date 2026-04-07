import { useCallback, useRef, useState } from 'react';

import { useAgent } from '../agent/agent-context.js';

import { PromptProvider } from './context.js';

/**
 * Headless prompt root. Owns input text state and the full send lifecycle.
 *
 * Calls `agent.prompt()` internally — must be used inside an `<AgentProvider>`.
 */
export function Prompt({ children }: { children: React.ReactNode }) {
	const agent = useAgent();
	const [input, setInput] = useState('');
	const [sending, setSending] = useState(false);
	const canSend = !!input.trim() && !sending;

	// Ref to latest input so the send callback doesn't go stale.
	const inputRef = useRef(input);
	inputRef.current = input;

	const send = useCallback(() => {
		const text = inputRef.current.trim();
		if (!text || sending) return;

		setInput('');
		setSending(true);

		void (async () => {
			try {
				const stream = agent.prompt({
					role: 'user',
					content: [{ type: 'text', text }],
				});
				for await (const _event of stream) {
					/* drained — events handled by extensions via observers */
				}
			} finally {
				setSending(false);
			}
		})();
	}, [agent, sending]);

	return (
		<PromptProvider value={{ input, setInput, sending, canSend, send }}>
			{children}
		</PromptProvider>
	);
}
