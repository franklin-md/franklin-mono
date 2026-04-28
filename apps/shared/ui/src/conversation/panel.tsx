import type { ReactNode } from 'react';

import {
	Prompt,
	useConversationTurns,
	type ConversationComponents,
} from '@franklin/react';

import { PromptInput } from './input/prompt-input.js';
import { ConversationView } from './view.js';

export interface ConversationPanelProps {
	additionalControls?: ReactNode[];
	components?: Partial<ConversationComponents>;
}

export function ConversationPanel({
	additionalControls,
	components,
}: ConversationPanelProps) {
	const turns = useConversationTurns();

	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns.get()} components={components} />
			<Prompt>
				<PromptInput additionalControls={additionalControls} />
			</Prompt>
		</div>
	);
}
