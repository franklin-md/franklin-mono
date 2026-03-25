import { useCallback, useState } from 'react';

import type { Agent } from '@franklin/agent/browser';
import { AgentProvider, useApp, useSessions } from '@franklin/react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentSidebarItem } from './agent-sidebar-item.js';

export function AgentSidebar({
	onSelectAgent,
}: {
	onSelectAgent: (agentId: string, agent: Agent) => void;
}) {
	const manager = useApp().agents;
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

	const handleDeleteAgent = useCallback(
		async (sessionId: string) => {
			await manager.remove(sessionId);

			// If we just deleted the active session, select another agent
			// TODO: refactor selection logic more generally
			if (currentAgentId === sessionId) {
				const remaining = sessions.filter((s) => s.sessionId !== sessionId);
				if (remaining.length > 0) {
					const next = remaining[0]!;
					setCurrentAgentId(next.sessionId);
					onSelectAgent(next.sessionId, next.agent);
				} else {
					setCurrentAgentId(null);
				}
			}
		},
		[manager, currentAgentId, sessions, onSelectAgent],
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
							<AgentProvider key={session.sessionId} agent={session.agent}>
								<AgentSidebarItem
									sessionId={session.sessionId}
									active={session.sessionId === currentAgentId}
									onSelect={(sessionId) =>
										handleSelectAgent(sessionId, session.agent)
									}
									onDelete={(sessionId) => void handleDeleteAgent(sessionId)}
								/>
							</AgentProvider>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
