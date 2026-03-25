import { useCallback, useEffect, useState } from 'react';

import {
	SessionManager,
	conversationExtension,
	todoExtension,
} from '@franklin/agent/browser';
import type { Agent } from '@franklin/agent/browser';
import { AgentProvider, SessionManagerProvider } from '@franklin/react';
import {
	ElectronFramework,
	createElectronPersistence,
} from '@franklin/electron/renderer';

import { AgentSidebar } from './sidebar/index.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';

interface SelectedAgent {
	id: string;
	agent: Agent;
}

export function AgentChatPage() {
	const [framework] = useState(() => new ElectronFramework());
	const [manager, setManager] = useState<SessionManager | null>(null);
	const [selected, setSelected] = useState<SelectedAgent | null>(null);

	useEffect(() => {
		void createElectronPersistence().then(async (persistence) => {
			const mgr = new SessionManager(
				() => framework.spawn(),
				[conversationExtension(), todoExtension()],
				persistence,
			);
			await mgr.restore();
			setManager(mgr);
		});

		return () => {
			void framework.dispose();
		};
	}, [framework]);

	const handleSelectAgent = useCallback((id: string, agent: Agent) => {
		setSelected({ id, agent });
	}, []);

	if (!manager) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Loading…
			</div>
		);
	}

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
						Spawn an agent to start.
					</div>
				)}
			</div>
		</SessionManagerProvider>
	);
}
