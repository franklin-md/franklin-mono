import type { ComponentType, ReactNode } from 'react';

import type { ToolUseBlock } from '@franklin/extensions';
import { Prompt, useConversationTurns, type ToolStatus } from '@franklin/react';

import { PromptInput } from './input/prompt-input.js';
import { ConversationView } from './view.js';

export interface ConversationPanelProps {
	toolUse?: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
	additionalControls?: ReactNode[];
}

export function ConversationPanel({
	toolUse,
	additionalControls,
}: ConversationPanelProps) {
	const turns = useConversationTurns();

	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns.get()} toolUse={toolUse} />
			<Prompt>
				<PromptInput additionalControls={additionalControls} />
			</Prompt>
		</div>
	);
}
