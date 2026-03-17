import { useState } from 'react';

import type { AgentCommands } from '@franklin/agent/browser';

import { Button } from '@/components/ui/button';

export function PromptInput({
	commands,
	sessionId,
}: {
	commands: AgentCommands;
	sessionId: string;
}) {
	const [input, setInput] = useState('');
	const [sending, setSending] = useState(false);

	async function handleSend() {
		const text = input.trim();
		if (!text || sending) return;

		setInput('');
		setSending(true);
		try {
			await commands.prompt({
				sessionId,
				prompt: [{ type: 'text', text }],
			});
		} finally {
			setSending(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void handleSend();
		}
	}

	return (
		<div className="border-t p-3">
			<div className="flex gap-2">
				<textarea
					className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					placeholder="Type a message..."
					rows={2}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={sending}
				/>
				<Button
					className="self-end"
					onClick={() => void handleSend()}
					disabled={!input.trim() || sending}
				>
					Send
				</Button>
			</div>
		</div>
	);
}
