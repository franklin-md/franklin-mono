import React, { useCallback, useEffect, useState } from 'react';
import { Text, useInput } from 'ink';

import type { AgentManager, AgentMetadata } from '@franklin/agent-manager';

import { ConversationView } from './components/main/conversation-view.js';
import { SessionList } from './components/sidebar/session-list.js';
import { StatusBar } from './components/status-bar.js';
import { Layout } from './components/layout.js';

interface Props {
	manager: AgentManager;
}

export function App({ manager }: Props): React.ReactNode {
	const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
	const [agents, setAgents] = useState<AgentMetadata[]>([]);
	const activeHandle = activeAgentId ? manager.get(activeAgentId) : undefined;

	const refreshAgents = useCallback(async () => {
		setAgents(await manager.list());
	}, [manager]);

	const createAgent = useCallback(async () => {
		const id = `agent-${Date.now()}`;
		const handle = await manager.create(id, {
			adapterKind: 'codex',
			sessionSpec: {},
		});
		await handle.dispatch({ type: 'session.start', spec: {} });
		await refreshAgents();
		setActiveAgentId(id);
	}, [manager, refreshAgents]);

	// Refresh agent list on mount
	useEffect(() => {
		void refreshAgents();
	}, [refreshAgents]);

	// Keyboard shortcut: 'n' to create new session (only when no active handle)
	useInput((input) => {
		if (input === 'n' && !activeHandle) {
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
				activeHandle ? (
					<ConversationView handle={activeHandle} />
				) : (
					<Text dimColor>Press 'n' to create a new session</Text>
				)
			}
			statusBar={<StatusBar handle={activeHandle} />}
		/>
	);
}
