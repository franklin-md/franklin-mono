import React from 'react';
import { Box, Text, useInput } from 'ink';

import type { AgentHandle } from '@franklin/agent-manager';
import type { PermissionRequest } from '@franklin/managed-agent';

interface Props {
	request: PermissionRequest;
	handle: AgentHandle;
}

export function PermissionPrompt({ request, handle }: Props): React.ReactNode {
	useInput((input) => {
		if (input === 'y' || input === 'Y') {
			void handle.dispatch({
				type: 'permission.resolve',
				decision: 'allow',
			});
		} else if (input === 'n' || input === 'N') {
			void handle.dispatch({
				type: 'permission.resolve',
				decision: 'deny',
			});
		}
	});

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="yellow"
			paddingX={1}
		>
			<Text color="yellow" bold>
				Permission Required
			</Text>
			<Text>{request.message}</Text>
			<Text dimColor>
				Press <Text bold>y</Text> to allow, <Text bold>n</Text> to deny
			</Text>
		</Box>
	);
}
