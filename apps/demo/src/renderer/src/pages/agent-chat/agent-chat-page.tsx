import { useCallback, useState } from 'react';

import type { Agent } from '@franklin/agent/browser';
import { AgentProvider } from '@franklin/react';

import { AgentSidebar } from './sidebar/index.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';

interface SelectedAgent {
	id: string;
	agent: Agent;
}

export function AgentChatPage() {
	const [selected, setSelected] = useState<SelectedAgent | null>(null);

	const handleSelectAgent = useCallback((id: string, agent: Agent) => {
		setSelected({ id, agent });
	}, []);

	return (
		<div className="flex flex-1 overflow-hidden">
			<AgentSidebar onSelectAgent={handleSelectAgent} />

			{selected ? (
				<AgentProvider key={selected.id} agent={selected.agent}>
					<div className="flex flex-1 overflow-hidden">
						<ConversationPanel />
						<TodoPanel />
					</div>
				</AgentProvider>
			) : (
				<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					Spawn an agent to start.
				</div>
			)}
		</div>
	);
}
