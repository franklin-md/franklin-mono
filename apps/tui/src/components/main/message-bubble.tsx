import React from 'react';
import { Box, Text } from 'ink';

import type { ConversationItem } from '../../lib/events-to-conversation.js';

interface Props {
	item: ConversationItem;
}

export function MessageBubble({ item }: Props): React.ReactNode {
	const isUser = item.kind === 'user_message';
	const isReasoning = item.kind === 'reasoning';
	const label = isUser ? '>' : isReasoning ? '  ~' : '  ';
	const color = isUser ? 'blue' : undefined;

	return (
		<Box flexDirection="row" marginBottom={1}>
			<Text color={color} bold={isUser} dimColor={isReasoning}>
				{label}{' '}
			</Text>
			<Box flexDirection="column" flexShrink={1}>
				<Text
					color={color}
					dimColor={isReasoning}
					italic={isReasoning}
					wrap="wrap"
				>
					{item.text}
					{item.streaming ? <Text dimColor> ...</Text> : null}
				</Text>
			</Box>
		</Box>
	);
}
