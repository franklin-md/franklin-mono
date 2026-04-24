import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import { AgentsProvider, AppContext } from '@franklin/react';
import { AgentTabs, AuthButton } from '@franklin/ui';

import { ActiveAgent } from './active-agent.js';

type ConversationWindowProps = {
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
};

export function ConversationWindow({
	app,
	getCreateInput,
}: ConversationWindowProps) {
	return (
		<AppContext.Provider value={app}>
			<AgentsProvider>
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
						<AuthButton />
					</header>
					<AgentTabs getCreateInput={getCreateInput} />
					<ActiveAgent />
				</div>
			</AgentsProvider>
		</AppContext.Provider>
	);
}
