import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import { AgentProvider, AppContext } from '@franklin/react';

import { ConversationPanel } from './conversation.js';
import { CopyStateButton } from './copy-state-button.js';

export function ObsidianApp({
	app,
	runtime,
}: {
	app: FranklinApp;
	runtime: FranklinRuntime;
}) {
	return (
		<AppContext.Provider value={app}>
			<AgentProvider agent={runtime}>
				<div className="flex h-full min-h-0 flex-col bg-background text-foreground">
					<header className="flex items-center justify-between px-4 py-3 ring-1 ring-inset ring-border/60">
						<div>
							<p className="text-sm font-semibold tracking-tight text-foreground">
								Franklin
							</p>
							<p className="text-xs text-muted-foreground">
								Obsidian agent window
							</p>
						</div>
						{process.env.NODE_ENV === 'development' && <CopyStateButton />}
					</header>
					<ConversationPanel />
				</div>
			</AgentProvider>
		</AppContext.Provider>
	);
}
