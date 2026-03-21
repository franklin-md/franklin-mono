import { useCallback, useState } from 'react';

import type { Agent } from '@franklin/agent/browser';
import { AgentProvider } from '@franklin/react';

import { AgentSidebar } from './sidebar/index.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';
import { useAgentManager } from './use-agent-manager.js';
import type { DemoExtensions } from './use-agent-manager.js';

interface SelectedAgent {
	id: string;
	agent: Agent<DemoExtensions>;
	sessionId: string;
}

export function AgentChatPage() {
	const factory = useAgentManager();
	const [selected, setSelected] = useState<SelectedAgent | null>(null);

	const handleSelectAgent = useCallback(
		(id: string, agent: Agent<DemoExtensions>, sessionId: string) => {
			setSelected({ id, agent, sessionId });
		},
		[],
	);

	return (
		<div className="flex flex-1 overflow-hidden">
			<AgentSidebar factory={factory} onSelectAgent={handleSelectAgent} />

			{selected ? (
				<AgentProvider key={selected.id} agent={selected.agent}>
					<div className="flex flex-1 overflow-hidden">
						<ConversationPanel sessionId={selected.sessionId} />
						<TodoPanel />
					</div>
				</AgentProvider>
			) : (
				<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					Create a group and spawn an agent to start.
				</div>
			)}
		</div>
	);
}
