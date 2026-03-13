import React from 'react';
import { Box, Text } from 'ink';

import type { TuiSession, TuiSessionStatus } from '../../lib/tui-session.js';

interface Props {
	session: TuiSession;
	isActive: boolean;
	onSelect: () => void;
}

function statusIndicator(status: TuiSessionStatus): {
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

export function SessionListItem({
	session,
	isActive,
}: Props): React.ReactNode {
	const { symbol, color } = statusIndicator(session.status);

	return (
		<Box>
			<Text color={color}>{symbol} </Text>
			<Text bold={isActive} inverse={isActive}>
				{session.agentId}
			</Text>
		</Box>
	);
}
