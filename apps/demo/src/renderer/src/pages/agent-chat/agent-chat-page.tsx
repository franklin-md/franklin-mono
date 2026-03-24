import { useCallback, useState } from 'react';

import {
	SessionManager,
	conversationExtension,
	todoExtension,
} from '@franklin/agent/browser';
import type { Agent } from '@franklin/agent/browser';
import { AgentProvider, SessionManagerProvider } from '@franklin/react';
import { ElectronFramework } from '@franklin/electron/renderer';

import { AgentSidebar } from './sidebar/index.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';

const framework = new ElectronFramework();
const manager = new SessionManager(
	() => framework.spawn(),
	[conversationExtension(), todoExtension()],
);

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
		<SessionManagerProvider manager={manager}>
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
						Create a group and spawn an agent to start.
					</div>
				)}
			</div>
		</SessionManagerProvider>
	);
}
