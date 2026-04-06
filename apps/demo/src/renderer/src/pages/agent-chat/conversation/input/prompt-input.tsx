import { CornerDownLeft } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { TextareaGroup } from '@/components/ui/textarea-group.js';

export function PromptInput({
	onSend,
	sending,
}: {
	onSend: (text: string) => Promise<void>;
	sending: boolean;
}) {
	const [input, setInput] = useState('');

	async function handleSend() {
		const text = input.trim();
		if (!text || sending) return;

		setInput('');
		await onSend(text);
	}

	return (
		<div className="p-3">
			<TextareaGroup
				value={input}
				onChange={setInput}
				onSubmit={() => void handleSend()}
				placeholder="Type a message..."
				disabled={sending}
				buttonBar={
					<>
						<div className="flex items-center gap-2" />
						<Button
							onClick={() => void handleSend()}
							disabled={!input.trim() || sending}
							className="gap-1.5 font-mono text-xs font-semibold disabled:opacity-40"
						>
							<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
							Enter
						</Button>
					</>
				}
			/>
		</div>
	);
}
