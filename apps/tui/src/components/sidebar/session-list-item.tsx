import React from 'react';
import { Box, Text } from 'ink';

import type { AgentStatus, AgentStore } from '../../lib/agent-store.js';
import { useAgentStore } from '../../hooks/use-agent-store.js';

interface Props {
	store: AgentStore;
	isActive: boolean;
	onSelect: () => void;
}

function statusIndicator(status: AgentStatus): {
	symbol: string;
	color: string;
} {
	switch (status) {
		case 'idle':
			return { symbol: '●', color: 'green' };
		case 'running':
			return { symbol: '●', color: 'yellow' };
		case 'error':
			return { symbol: '●', color: 'red' };
		case 'disposed':
			return { symbol: '○', color: 'gray' };
	}
}

export function SessionListItem({ store, isActive }: Props): React.ReactNode {
	const { status } = useAgentStore(store);
	const { symbol, color } = statusIndicator(status);

	return (
		<Box>
			<Text color={color}>{symbol} </Text>
			<Text bold={isActive} inverse={isActive}>
				{store.agentId}
			</Text>
		</Box>
	);
}
