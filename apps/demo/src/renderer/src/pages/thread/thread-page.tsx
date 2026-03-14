import { useSessionSnapshot } from '@franklin/react-agents/browser';

import { ConversationView } from '@/components/conversation';
import { Sidebar } from '@/components/sidebar';

import { useManager } from './hooks/use-manager';
import { useNew } from './hooks/use-new';
import { useSend } from './hooks/use-send';

export function ThreadPage() {
	const manager = useManager();
	const { activeId, setActiveId, activeSession, spawn } = useNew(manager);
	const snapshot = useSessionSnapshot(activeSession);
	const { input, setInput, inputRef, send } = useSend(activeSession);

	return (
		<div className="flex flex-1 overflow-hidden">
			<Sidebar
				manager={manager}
				activeId={activeId}
				onSelect={setActiveId}
				onSpawn={() => {
					void spawn();
					setTimeout(() => inputRef.current?.focus(), 0);
				}}
			/>

			<div className="flex flex-1 flex-col">
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
										if (e.key === 'Enter') send();
									}}
									placeholder="Send a message..."
									className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									disabled={activeSession.status === 'disposed'}
								/>
								<button
									onClick={send}
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
