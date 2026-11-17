import {
	useThrottledConversationTurns,
	type ConversationComponents,
	type ToolRendererRegistry,
} from '@franklin/react';

import { ConversationView } from './view.js';

export interface ConversationTranscriptProps {
	components?: Partial<ConversationComponents>;
	toolRegistry?: ToolRendererRegistry;
}

export function ConversationTranscript({
	components,
	toolRegistry,
}: ConversationTranscriptProps) {
	const turns = useThrottledConversationTurns();

	return (
		<ConversationView
			turns={turns}
			components={components}
			toolRegistry={toolRegistry}
		/>
	);
}
