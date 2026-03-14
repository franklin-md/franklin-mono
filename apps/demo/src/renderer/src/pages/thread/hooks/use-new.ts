import { useCallback, useState } from 'react';
import type { AgentManager } from '@franklin/react-agents/browser';

export function useNew(manager: AgentManager) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const activeSession = activeId ? manager.get(activeId) : undefined;

	const spawn = useCallback(async () => {
		const session = await manager.spawn('codex', '/tmp');
		setActiveId(session.id);
	}, [manager]);

	return { activeId, setActiveId, activeSession, spawn };
}
