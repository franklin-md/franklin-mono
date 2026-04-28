import type { AgentCreateInput } from '@franklin/agent/browser';
import { AgentsProvider } from '@franklin/react';
import { AgentTabs, AuthSettingsTrigger } from '@franklin/ui';

import { ActiveAgent } from './active-agent.js';

type ConversationWindowProps = {
	getCreateInput: () => AgentCreateInput;
};

export function ConversationWindow({
	getCreateInput,
}: ConversationWindowProps) {
	return (
		<AgentsProvider>
			<div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
				<header className="flex items-center justify-between px-4 py-3 ring-1 ring-inset ring-border/60">
					<div>
						<p className="text-sm font-semibold tracking-tight text-foreground">
							Franklin
						</p>
						<p className="text-xs text-muted-foreground">
							Obsidian agent window
						</p>
					</div>
					<AuthSettingsTrigger />
				</header>
				<AgentTabs getCreateInput={getCreateInput} />
				<ActiveAgent />
			</div>
		</AgentsProvider>
	);
}
