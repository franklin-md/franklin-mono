import React from 'react';
import { Box, Text } from 'ink';

import type { ConversationItem } from '../../lib/project-transcript.js';

interface Props {
	item: ConversationItem;
}

export function MessageBubble({ item }: Props): React.ReactNode {
	if (item.kind === 'tool_call') {
		return (
			<Box flexDirection="row" marginBottom={1}>
				<Text dimColor>{'  [tool] '}</Text>
				<Text dimColor>
					{item.toolTitle ?? 'Tool call'}{' '}
					{item.toolStatus ? `[${item.toolStatus}]` : ''}
				</Text>
			</Box>
		);
	}

	const isUser = item.kind === 'user_message';
	const isThought = item.kind === 'agent_thought';
	const label = isUser ? '>' : isThought ? '  ~' : '  ';
	const color = isUser ? 'blue' : undefined;

	return (
		<Box flexDirection="row" marginBottom={1}>
			<Text color={color} bold={isUser} dimColor={isThought}>
				{label}{' '}
			</Text>
			<Box flexDirection="column" flexShrink={1}>
				<Text color={color} dimColor={isThought} italic={isThought} wrap="wrap">
					{item.text}
					{item.streaming ? <Text dimColor> ...</Text> : null}
				</Text>
			</Box>
		</Box>
	);
}
