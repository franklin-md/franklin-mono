import { useCallback, useRef, useState } from 'react';

import type {
	Agent,
	Extension,
	SpawnPoint,
	SpawnPointFactory,
} from '@franklin/agent/browser';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { SidebarGroup } from './sidebar-group.js';

interface AgentEntry<E extends Extension<any>[]> {
	id: string;
	name: string;
	agent: Agent<E>;
}

interface GroupData<E extends Extension<any>[]> {
	id: string;
	name: string;
	spawnPoint: SpawnPoint<E>;
	agents: AgentEntry<E>[];
}

export function AgentSidebar<E extends Extension<any>[]>({
	factory,
	onSelectAgent,
}: {
	factory: SpawnPointFactory<E>;
	onSelectAgent: (agent: Agent<E>) => void;
}) {
	const [groups, setGroups] = useState<GroupData<E>[]>([]);
	const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

	const groupCounterRef = useRef(0);
	const agentCounterRef = useRef(0);
	const groupsRef = useRef(groups);
	groupsRef.current = groups;

	const handleCreateGroup = useCallback(() => {
		groupCounterRef.current += 1;
		const spawnPoint = factory();
		setGroups((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				name: `Group ${String(groupCounterRef.current)}`,
				spawnPoint,
				agents: [],
			},
		]);
	}, [factory]);

	const handleSpawnAgent = useCallback(async (groupId: string) => {
		const group = groupsRef.current.find((g) => g.id === groupId);
		if (!group) return;

		const agent = await group.spawnPoint();
		agentCounterRef.current += 1;
		const entry: AgentEntry<E> = {
			id: crypto.randomUUID(),
			name: `Agent ${String(agentCounterRef.current)}`,
			agent,
		};

		setGroups((prev) =>
			prev.map((g) =>
				g.id === groupId ? { ...g, agents: [...g.agents, entry] } : g,
			),
		);
	}, []);

	const handleSelectAgent = useCallback(
		(agentId: string, agent: Agent<E>) => {
			setCurrentAgentId(agentId);
			onSelectAgent(agent);
		},
		[onSelectAgent],
	);

	return (
		<div className="flex w-60 flex-col border-r">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<span className="text-sm font-semibold">Agents</span>
				<Button variant="ghost" size="sm" onClick={handleCreateGroup}>
					+ Group
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{groups.length === 0 ? (
						<p className="py-8 text-center text-xs text-muted-foreground">
							No groups yet.
						</p>
					) : (
						groups.map((group) => (
							<SidebarGroup
								key={group.id}
								name={group.name}
								agents={group.agents}
								currentAgentId={currentAgentId}
								onSpawnAgent={() => void handleSpawnAgent(group.id)}
								onSelectAgent={handleSelectAgent}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
