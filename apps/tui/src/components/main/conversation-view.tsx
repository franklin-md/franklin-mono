import React from 'react';
import { Box } from 'ink';

import type { AgentHandle } from '@franklin/agent-manager';

import { useAgentHandle } from '../../hooks/use-agent-handle.js';
import { useInput } from '../../hooks/use-input.js';
import { InputBar } from './input-bar.js';
import { MessageList } from './message-list.js';
import { PermissionPrompt } from './permission-prompt.js';

interface Props {
	handle: AgentHandle;
}

export function ConversationView({ handle }: Props): React.ReactNode {
	const { conversation, pendingPermission, status } = useAgentHandle(handle);
	const { text, setText, submit } = useInput(handle);
	const isDisabled = status === 'disposed' || status === 'exited';

	return (
		<Box flexDirection="column" flexGrow={1}>
			<Box flexDirection="column" flexGrow={1}>
				<MessageList items={conversation} />
			</Box>
			{pendingPermission ? (
				<PermissionPrompt request={pendingPermission} handle={handle} />
			) : null}
			<InputBar
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={isDisabled}
			/>
		</Box>
	);
}
