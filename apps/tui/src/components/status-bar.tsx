import React from 'react';
import { Box, Text } from 'ink';

import type { TuiSession } from '../lib/tui-session.js';

interface Props {
	session: TuiSession | undefined;
}

export function StatusBar({ session }: Props): React.ReactNode {
	if (!session) {
		return (
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text dimColor>No active session</Text>
			</Box>
		);
	}

	const statusColor =
		session.status === 'running'
			? 'yellow'
			: session.status === 'error'
				? 'red'
				: session.status === 'disposed'
					? 'gray'
					: 'green';

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text>
				<Text bold>{session.agentId}</Text>
				<Text> </Text>
				<Text color={statusColor}>[{session.status}]</Text>
			</Text>
		</Box>
	);
}
