import type { ComponentType } from 'react';

import type { ToolUseBlock } from '@franklin/extensions';
import { Prompt, useConversationTurns, type ToolStatus } from '@franklin/react';

import { PromptInput } from './input/prompt-input.js';
import { ConversationView } from './view.js';

export interface ConversationPanelProps {
	toolUse?: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
}

export function ConversationPanel({ toolUse }: ConversationPanelProps) {
	const turns = useConversationTurns();

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns.get()} toolUse={toolUse} />
			<Prompt>
				<PromptInput />
			</Prompt>
		</div>
	);
}
