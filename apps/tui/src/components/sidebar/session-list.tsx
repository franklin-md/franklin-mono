import React from 'react';
import { Box, Text } from 'ink';

import type { AgentStore } from '../../lib/agent-store.js';
import { SessionListItem } from './session-list-item.js';

interface Props {
	agents: AgentStore[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
}

export function SessionList({
	agents,
	activeId,
	onSelect,
	onCreate: _onCreate,
}: Props): React.ReactNode {
	return (
		<Box flexDirection="column">
			<Text bold underline>
				Sessions
			</Text>
			<Box flexDirection="column" marginTop={1}>
				{agents.map((store) => (
					<SessionListItem
						key={store.agentId}
						store={store}
						isActive={store.agentId === activeId}
						onSelect={() => onSelect(store.agentId)}
					/>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>[n] New session</Text>
			</Box>
		</Box>
	);
}
