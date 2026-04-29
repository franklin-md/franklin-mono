import type { AgentCreateInput } from '@franklin/agent/browser';
import { AgentsProvider } from '@franklin/react';
import { AgentTabs } from '@franklin/ui';

import { ActiveAgent } from './active-agent.js';

type ConversationWindowProps = {
	getCreateInput: () => AgentCreateInput;
};

export function ConversationWindow({
	getCreateInput,
}: ConversationWindowProps) {
	return (
		<AgentsProvider>
			<div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
				<AgentTabs getCreateInput={getCreateInput} />
				<ActiveAgent />
			</div>
		</AgentsProvider>
	);
}
