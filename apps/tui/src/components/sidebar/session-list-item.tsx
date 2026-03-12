import React from 'react';
import { Box, Text } from 'ink';

import type { AgentMetadata, AgentStatus } from '@franklin/agent-manager';

interface Props {
	agent: AgentMetadata;
	isActive: boolean;
	onSelect: () => void;
}

function statusIndicator(status: AgentStatus): {
	symbol: string;
	color: string;
} {
	switch (status) {
		case 'ready':
		case 'idle':
			return { symbol: '●', color: 'green' };
		case 'running':
			return { symbol: '●', color: 'yellow' };
		case 'error':
			return { symbol: '●', color: 'red' };
		case 'exited':
		case 'disposed':
			return { symbol: '○', color: 'gray' };
		case 'created':
			return { symbol: '◌', color: 'gray' };
	}
}

export function SessionListItem({ agent, isActive }: Props): React.ReactNode {
	const { symbol, color } = statusIndicator(agent.status);
	const label = agent.agentId;

	return (
		<Box>
			<Text color={color}>{symbol} </Text>
			<Text bold={isActive} inverse={isActive}>
				{label}
			</Text>
		</Box>
	);
}
