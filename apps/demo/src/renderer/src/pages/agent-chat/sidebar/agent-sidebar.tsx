import { useCallback, useState } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';
import {
	AgentProvider,
	useApp,
	useSessions,
	useSettings,
} from '@franklin/react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentSidebarItem } from './agent-sidebar-item.js';

export function AgentSidebar({
	onSelectAgent,
}: {
	onSelectAgent: (agentId: string, agent: FranklinRuntime) => void;
}) {
	const manager = useApp().agents;
	const settings = useSettings();
	const sessions = useSessions();
	const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

	const handleSpawnAgent = useCallback(async () => {
		const session = await manager.create({
			overrides: {
				core: { llmConfig: settings.get().defaultLLMConfig },
				env: {
					fsConfig: {
						cwd: '/tmp',
						permissions: { allowRead: ['**'], allowWrite: ['**'] },
					},
					netConfig: { allowedDomains: [], deniedDomains: [] },
				},
			},
		});
		setCurrentAgentId(session.id);
		onSelectAgent(session.id, session.runtime);
	}, [manager, settings, onSelectAgent]);

	const handleSelectAgent = useCallback(
		(agentId: string, agent: FranklinRuntime) => {
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
				const remaining = sessions.filter((s) => s.id !== sessionId);
				const [next] = remaining;
				if (next) {
					setCurrentAgentId(next.id);
					onSelectAgent(next.id, next.runtime);
				} else {
					setCurrentAgentId(null);
				}
			}
		},
		[manager, currentAgentId, sessions, onSelectAgent],
	);

	return (
		<div className="flex w-64 flex-col overflow-hidden border-r border-border bg-muted">
			<div className="flex items-center justify-between px-4 py-3.5">
				<span className="text-sm font-semibold">Agents</span>
				<Button
					variant="ghost"
					size="sm"
					className="rounded-full bg-background/70 px-2.5 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
					onClick={() => void handleSpawnAgent()}
				>
					+ Agent
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="px-3 pb-3">
					{sessions.length === 0 ? (
						<p className="py-8 text-center text-xs text-muted-foreground">
							No agents yet.
						</p>
					) : (
						sessions.map((session) => (
							<AgentProvider key={session.id} agent={session.runtime}>
								<AgentSidebarItem
									sessionId={session.id}
									active={session.id === currentAgentId}
									onSelect={(sessionId) =>
										handleSelectAgent(sessionId, session.runtime)
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
