import {
	useThrottledConversationTurns,
	type ConversationComponents,
} from '@franklin/react';

import { ConversationView } from './view.js';

export interface ConversationTranscriptProps {
	components?: Partial<ConversationComponents>;
}

export function ConversationTranscript({
	components,
}: ConversationTranscriptProps) {
	const turns = useThrottledConversationTurns();

	return <ConversationView turns={turns} components={components} />;
}
