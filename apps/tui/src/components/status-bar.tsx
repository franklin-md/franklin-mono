import React from 'react';
import { Box, Text } from 'ink';

import type { AgentHandle } from '@franklin/agent-manager';

interface Props {
	handle: AgentHandle | undefined;
}

export function StatusBar({ handle }: Props): React.ReactNode {
	if (!handle) {
		return (
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text dimColor>No active session</Text>
			</Box>
		);
	}

	const statusColor =
		handle.status === 'running'
			? 'yellow'
			: handle.status === 'error'
				? 'red'
				: handle.status === 'exited' || handle.status === 'disposed'
					? 'gray'
					: 'green';

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text>
				<Text bold>{handle.agentId}</Text>
				<Text> </Text>
				<Text color={statusColor}>[{handle.status}]</Text>
			</Text>
		</Box>
	);
}
