import type { Agent, Extension } from '@franklin/agent/browser';

import { Button } from '@/components/ui/button';

import { SidebarItem } from './sidebar-item.js';

interface AgentEntry<E extends Extension<any>[]> {
	id: string;
	name: string;
	agent: Agent<E>;
	sessionId: string;
}

export function SidebarGroup<E extends Extension<any>[]>({
	name,
	agents,
	currentAgentId,
	onSpawnAgent,
	onSelectAgent,
}: {
	name: string;
	agents: AgentEntry<E>[];
	currentAgentId: string | null;
	onSpawnAgent: () => void;
	onSelectAgent: (agentId: string, agent: Agent<E>, sessionId: string) => void;
}) {
	return (
		<div className="mb-2">
			<div className="flex items-center justify-between px-2 py-1">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{name}
				</span>
				<Button
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0"
					onClick={onSpawnAgent}
				>
					+
				</Button>
			</div>
			<div className="flex flex-col gap-0.5">
				{agents.map((entry) => (
					<SidebarItem
						key={entry.id}
						name={entry.name}
						active={entry.id === currentAgentId}
						onClick={() =>
							onSelectAgent(entry.id, entry.agent, entry.sessionId)
						}
					/>
				))}
			</div>
		</div>
	);
}
