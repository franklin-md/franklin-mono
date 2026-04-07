import { CornerDownLeft } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { TextareaGroup } from '@/components/ui/textarea-group.js';

export function PromptInput({
	onSend,
	sending,
	defaultValue = '',
}: {
	onSend: (text: string) => Promise<void>;
	sending: boolean;
	defaultValue?: string;
}) {
	const [input, setInput] = useState(defaultValue);

	async function handleSend() {
		const text = input.trim();
		if (!text || sending) return;

		setInput('');
		await onSend(text);
	}

	return (
		<div className="px-4 pb-4 pt-2">
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
							variant="ghost"
							size="sm"
							onClick={() => void handleSend()}
							disabled={!input.trim() || sending}
							className="h-8 gap-1.5 rounded-lg bg-background/80 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-inset ring-ring/40 shadow-sm transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"
						>
							<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
							Enter
						</Button>
					</>
				}
			/>
		</div>
	);
}
