import React, { useCallback, useEffect, useState } from 'react';
import { Text, useInput } from 'ink';

import type { AgentStore } from './lib/agent-store.js';
import type { TuiAgentManager } from './lib/tui-agent-manager.js';
import { ConversationView } from './components/main/conversation-view.js';
import { SessionList } from './components/sidebar/session-list.js';
import { StatusBar } from './components/status-bar.js';
import { Layout } from './components/layout.js';

interface Props {
	manager: TuiAgentManager;
}

export function App({ manager }: Props): React.ReactNode {
	const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
	const [agents, setAgents] = useState<AgentStore[]>([]);
	const activeStore = activeAgentId ? manager.get(activeAgentId) : undefined;

	useEffect(() => {
		setAgents(manager.list());
		return manager.subscribe(() => {
			setAgents(manager.list());
		});
	}, [manager]);

	const createAgent = useCallback(async () => {
		const id = `agent-${Date.now()}`;
		await manager.spawn(id, process.cwd());
		setActiveAgentId(id);
	}, [manager]);

	// Keyboard shortcut: 'n' to create new session (only when no active store)
	useInput((input) => {
		if (input === 'n' && !activeStore) {
			void createAgent();
		}
	});

	return (
		<Layout
			sidebar={
				<SessionList
					agents={agents}
					activeId={activeAgentId}
					onSelect={setActiveAgentId}
					onCreate={createAgent}
				/>
			}
			main={
				activeStore ? (
					<ConversationView store={activeStore} />
				) : (
					<Text dimColor>Press 'n' to create a new session</Text>
				)
			}
			statusBar={<StatusBar store={activeStore} />}
		/>
	);
}
