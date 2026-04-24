import { AgentProvider, useAgents } from '@franklin/react';

import { ConversationPanel } from '../conversation.js';

export function ActiveAgent() {
	const { sessions, activeSession } = useAgents();

	if (activeSession == null) {
		if (sessions.length > 0) {
			return <div className="flex-1" />;
		}

		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				No agents yet. Create one to start.
			</div>
		);
	}

	return (
		<AgentProvider key={activeSession.id} agent={activeSession.runtime}>
			<ConversationPanel />
		</AgentProvider>
	);
}
