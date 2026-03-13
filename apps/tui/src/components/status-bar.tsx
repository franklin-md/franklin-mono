import React from 'react';
import { Box, Text } from 'ink';

import type { AgentStore } from '../lib/agent-store.js';
import { useAgentStore } from '../hooks/use-agent-store.js';

interface Props {
	store: AgentStore | undefined;
}

export function StatusBar({ store }: Props): React.ReactNode {
	const { status } = useAgentStore(store);

	if (!store) {
		return (
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text dimColor>No active session</Text>
			</Box>
		);
	}

	const statusColor =
		status === 'running'
			? 'yellow'
			: status === 'error'
				? 'red'
				: status === 'disposed'
					? 'gray'
					: 'green';

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text>
				<Text bold>{store.agentId}</Text>
				<Text> </Text>
				<Text color={statusColor}>[{status}]</Text>
			</Text>
		</Box>
	);
}
