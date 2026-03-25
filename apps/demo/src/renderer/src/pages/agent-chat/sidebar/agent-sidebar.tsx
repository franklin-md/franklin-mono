import { useCallback, useState } from 'react';

import type { Agent } from '@franklin/agent/browser';
import { useSessionManager, useSessions } from '@franklin/react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentSidebarItem } from './agent-sidebar-item.js';

export function AgentSidebar({
	onSelectAgent,
}: {
	onSelectAgent: (agentId: string, agent: Agent) => void;
}) {
	const manager = useSessionManager();
	const sessions = useSessions();
	const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

	const handleSpawnAgent = useCallback(async () => {
		const session = await manager.new();
		setCurrentAgentId(session.sessionId);
		onSelectAgent(session.sessionId, session.agent);
	}, [manager, onSelectAgent]);

	const handleSelectAgent = useCallback(
		(agentId: string, agent: Agent) => {
			setCurrentAgentId(agentId);
			onSelectAgent(agentId, agent);
		},
		[onSelectAgent],
	);

	return (
		<div className="flex w-60 flex-col border-r">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<span className="text-sm font-semibold">Agents</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => void handleSpawnAgent()}
				>
					+ Agent
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{sessions.length === 0 ? (
						<p className="py-8 text-center text-xs text-muted-foreground">
							No agents yet.
						</p>
					) : (
						sessions.map((session) => (
							<AgentSidebarItem
								key={session.sessionId}
								session={session}
								active={session.sessionId === currentAgentId}
								onSelect={(sessionId) =>
									handleSelectAgent(sessionId, session.agent)
								}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
