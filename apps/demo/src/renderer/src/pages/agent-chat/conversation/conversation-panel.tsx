import {
	Prompt,
	PromptControls,
	PromptSend,
	PromptText,
	useConversationTurns,
} from '@franklin/react';

import { Button } from '@/components/ui/button.js';

import { ModelSelector } from './input/model-selector/model-selector.js';
import { ThinkingToggle } from './input/thinking-toggle.js';
import { ConversationView } from './view/conversation-view.js';

export function ConversationPanel() {
	const turns = useConversationTurns();

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns.get()} />
			<Prompt>
				<div className="border-t p-3">
					<div className="flex gap-2">
						<PromptText>
							<textarea
								className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								placeholder="Type a message..."
								rows={2}
							/>
						</PromptText>
						<div className="flex flex-col justify-end gap-1">
							<ThinkingToggle />
							<PromptSend>
								<Button>Send</Button>
							</PromptSend>
						</div>
					</div>
					<PromptControls>
						<div className="mt-1.5 flex items-center">
							<ModelSelector />
						</div>
					</PromptControls>
				</div>
			</Prompt>
		</div>
	);
}
