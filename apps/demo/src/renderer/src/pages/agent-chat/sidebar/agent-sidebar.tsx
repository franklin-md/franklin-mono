import { useCallback, useEffect, useRef, useState } from 'react';

import type {
	Agent,
	SessionManager as FranklinSessionManager,
} from '@franklin/agent/browser';
import { useSessionManager } from '@franklin/react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarItem } from './sidebar-item.js';

interface AgentEntry {
	id: string;
	name: string;
	agent: Agent;
}

type StoredAgentData = Pick<AgentEntry, 'id' | 'name'>;
type LegacyStoredGroupData = {
	id: string;
	name: string;
	agents: StoredAgentData[];
};

const AGENTS_STORAGE_KEY = 'franklin.demo.agent-list';
const LEGACY_GROUPS_STORAGE_KEY = 'franklin.demo.agent-groups';

let restorePromise: Promise<void> | null = null;

function ensureRestored(manager: FranklinSessionManager): Promise<void> {
	restorePromise ??= manager.restore();
	return restorePromise;
}

function parseStoredAgents(): StoredAgentData[] {
	const raw = window.localStorage.getItem(AGENTS_STORAGE_KEY);
	if (raw) {
		try {
			return JSON.parse(raw) as StoredAgentData[];
		} catch {
			return [];
		}
	}

	const legacyRaw = window.localStorage.getItem(LEGACY_GROUPS_STORAGE_KEY);
	if (!legacyRaw) return [];

	try {
		const legacy = JSON.parse(legacyRaw) as LegacyStoredGroupData[];
		return legacy.flatMap((group) => group.agents);
	} catch {
		return [];
	}
}

function loadStoredAgents(manager: FranklinSessionManager): AgentEntry[] {
	const stored = parseStoredAgents();
	if (stored.length === 0) return [];

	return stored.flatMap((entry) => {
		try {
			const session = manager.get(entry.id);
			return [{ ...entry, agent: session.agent }];
		} catch {
			return [];
		}
	});
}

function persistAgents(agents: AgentEntry[]): void {
	const stored: StoredAgentData[] = agents.map(({ id, name }) => ({
		id,
		name,
	}));
	window.localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(stored));
	window.localStorage.removeItem(LEGACY_GROUPS_STORAGE_KEY);
}

function nextAgentName(count: number): string {
	return `Agent ${String(count)}`;
}

export function AgentSidebar({
	onSelectAgent,
}: {
	onSelectAgent: (agentId: string, agent: Agent) => void;
}) {
	const manager = useSessionManager();
	const [agents, setAgents] = useState<AgentEntry[]>([]);
	const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);

	const agentCounterRef = useRef(0);

	useEffect(() => {
		let isActive = true;

		void (async () => {
			await ensureRestored(manager);
			if (!isActive) return;

			const restoredAgents = loadStoredAgents(manager);
			setAgents(restoredAgents);
			agentCounterRef.current = restoredAgents.length;

			const firstAgent = restoredAgents[0];
			if (firstAgent) {
				setCurrentAgentId(firstAgent.id);
				onSelectAgent(firstAgent.id, firstAgent.agent);
			}

			setIsHydrated(true);
		})();

		return () => {
			isActive = false;
		};
	}, [manager, onSelectAgent]);

	useEffect(() => {
		if (!isHydrated) return;
		persistAgents(agents);
	}, [agents, isHydrated]);

	const handleSpawnAgent = useCallback(async () => {
		const session = await manager.new();
		agentCounterRef.current += 1;

		const entry: AgentEntry = {
			id: session.sessionId,
			name: nextAgentName(agentCounterRef.current),
			agent: session.agent,
		};

		setAgents((prev) => [...prev, entry]);

		setCurrentAgentId(entry.id);
		onSelectAgent(entry.id, session.agent);
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
					disabled={!isHydrated}
					onClick={() => void handleSpawnAgent()}
				>
					+ Agent
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{!isHydrated ? (
						<p className="py-8 text-center text-xs text-muted-foreground">
							Loading agents...
						</p>
					) : agents.length === 0 ? (
						<p className="py-8 text-center text-xs text-muted-foreground">
							No agents yet.
						</p>
					) : (
						agents.map((entry) => (
							<SidebarItem
								key={entry.id}
								name={entry.name}
								active={entry.id === currentAgentId}
								onClick={() => handleSelectAgent(entry.id, entry.agent)}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
