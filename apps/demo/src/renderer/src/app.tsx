import { useCallback, useMemo, useRef, useState } from 'react';
import {
	AgentManager,
	useSessionSnapshot,
} from '@franklin/react-agents/browser';
import { AgentConnection } from '@franklin/agent/browser';

import { ConversationView } from '@/components/conversation';
import { Sidebar } from '@/components/sidebar';
import { createRendererIpcTransport } from '@/lib/ipc-transport';

function useManager() {
	return useMemo(
		() =>
			new AgentManager({
				createConnection: async (agent, cwd) => {
					const agentId = await window.franklinBridge.spawn(agent, cwd);
					const transport = createRendererIpcTransport(agentId);
					return new AgentConnection(transport);
				},
			}),
		[],
	);
}

export function App() {
	const manager = useManager();
	const [activeId, setActiveId] = useState<string | null>(null);
	const activeSession = activeId ? manager.get(activeId) : undefined;
	const snapshot = useSessionSnapshot(activeSession);
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSpawn = useCallback(async () => {
		const session = await manager.spawn('codex', '/tmp');
		setActiveId(session.id);
		setTimeout(() => inputRef.current?.focus(), 0);
	}, [manager]);

	const handleSend = useCallback(() => {
		if (!activeSession || !input.trim()) return;
		void activeSession.prompt(input.trim());
		setInput('');
	}, [activeSession, input]);

	return (
		<div className="flex h-screen bg-background">
			<Sidebar
				manager={manager}
				activeId={activeId}
				onSelect={setActiveId}
				onSpawn={() => void handleSpawn()}
			/>

			<div className="flex flex-1 flex-col">
				<header className="border-b px-6 py-3">
					<h1 className="text-lg font-semibold tracking-tight">
						Franklin — Thread Demo
					</h1>
				</header>

				{activeSession ? (
					<>
						<ConversationView
							snapshot={snapshot}
							className="flex-1 overflow-hidden"
						/>
						<div className="border-t px-4 py-3">
							<div className="flex gap-2">
								<input
									ref={inputRef}
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSend();
									}}
									placeholder="Send a message..."
									className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									disabled={activeSession.status === 'disposed'}
								/>
								<button
									onClick={handleSend}
									disabled={
										activeSession.status === 'disposed' || !input.trim()
									}
									className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
								>
									Send
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex flex-1 items-center justify-center text-muted-foreground">
						<p>Spawn a session to get started</p>
					</div>
				)}
			</div>
		</div>
	);
}
