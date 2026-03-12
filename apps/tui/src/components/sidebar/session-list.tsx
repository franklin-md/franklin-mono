import React from 'react';
import { Box, Text } from 'ink';

import type { AgentMetadata } from '@franklin/agent-manager';

import { SessionListItem } from './session-list-item.js';

interface Props {
	agents: AgentMetadata[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
}

export function SessionList({
	agents,
	activeId,
	onSelect,
	onCreate,
}: Props): React.ReactNode {
	return (
		<Box flexDirection="column">
			<Text bold underline>
				Sessions
			</Text>
			<Box flexDirection="column" marginTop={1}>
				{agents.map((agent) => (
					<SessionListItem
						key={agent.agentId}
						agent={agent}
						isActive={agent.agentId === activeId}
						onSelect={() => onSelect(agent.agentId)}
					/>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>[n] New session</Text>
			</Box>
		</Box>
	);
}
