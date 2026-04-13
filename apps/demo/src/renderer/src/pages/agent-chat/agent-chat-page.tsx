import { AgentProvider, AgentsProvider, useAgents } from '@franklin/react';

import { AgentSidebar } from './sidebar/index.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';

export function AgentChatPage() {
	return (
		<AgentsProvider>
			<div className="flex flex-1 overflow-hidden">
				<AgentSidebar />
				<ActiveAgent />
			</div>
		</AgentsProvider>
	);
}

function ActiveAgent() {
	const { activeSession } = useAgents();

	if (!activeSession) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Spawn an agent to start.
			</div>
		);
	}

	return (
		<AgentProvider key={activeSession.id} agent={activeSession.runtime}>
			<div className="flex flex-1 overflow-hidden">
				<ConversationPanel />
				<TodoPanel />
			</div>
		</AgentProvider>
	);
}
