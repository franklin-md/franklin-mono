import React from 'react';
import { Box, Text } from 'ink';

import type { TuiSession } from '../../lib/tui-session.js';
import { SessionListItem } from './session-list-item.js';

interface Props {
	agents: TuiSession[];
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
				{agents.map((session) => (
					<SessionListItem
						key={session.agentId}
						session={session}
						isActive={session.agentId === activeId}
						onSelect={() => onSelect(session.agentId)}
					/>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>[n] New session</Text>
			</Box>
		</Box>
	);
}
