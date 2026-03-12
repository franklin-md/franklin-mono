import React from 'react';
import { Box, Text } from 'ink';

import type { ConversationItem } from '../../lib/events-to-conversation.js';
import { MessageBubble } from './message-bubble.js';

interface Props {
	items: ConversationItem[];
}

export function MessageList({ items }: Props): React.ReactNode {
	if (items.length === 0) {
		return (
			<Box>
				<Text dimColor>No messages yet. Type below to start.</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{items.map((item, i) => (
				<MessageBubble key={i} item={item} />
			))}
		</Box>
	);
}
