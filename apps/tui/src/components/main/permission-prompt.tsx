import React from 'react';
import { Box, Text, useInput } from 'ink';

import type { AgentStore, PendingPermission } from '../../lib/agent-store.js';

interface Props {
	pending: PendingPermission;
	store: AgentStore;
}

export function PermissionPrompt({ pending, store }: Props): React.ReactNode {
	const { request } = pending;
	const title = request.toolCall.title ?? 'Unknown tool';
	const kind = request.toolCall.kind ?? 'other';

	useInput((input) => {
		if (input === 'y' || input === 'Y') {
			const option = request.options.find((o) => o.kind === 'allow_once');
			if (option) store.resolvePermission(option.optionId);
		} else if (input === 'n' || input === 'N') {
			const option = request.options.find((o) => o.kind === 'reject_once');
			if (option) store.resolvePermission(option.optionId);
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
			<Text>
				{title} ({kind})
			</Text>
			<Text dimColor>
				Press <Text bold>y</Text> to allow, <Text bold>n</Text> to deny
			</Text>
		</Box>
	);
}
