import { useCallback } from 'react';

import { AgentList, useAgents, useSettings } from '@franklin/react';

import { Button } from '../primitives/button.js';
import { ScrollArea } from '../primitives/scroll-area.js';
import { AgentSidebarItem } from './agent-sidebar-item.js';

const Empty = () => (
	<p className="py-8 text-center text-xs text-muted-foreground">
		No agents yet.
	</p>
);

export function AgentSidebar() {
	const { create } = useAgents();
	const settings = useSettings();

	const handleCreate = useCallback(() => {
		void create({
			overrides: {
				core: { llmConfig: settings.get().defaultLLMConfig },
				env: {
					fsConfig: {
						cwd: '/private/tmp',
						permissions: {
							denyRead: ['/'],
							allowRead: ['/private/tmp'],
							allowWrite: [],
							denyWrite: [],
						},
					},
					netConfig: { allowedDomains: [], deniedDomains: [] },
				},
			},
		});
	}, [create, settings]);

	return (
		<div className="flex w-64 flex-col overflow-hidden border-r border-border bg-muted">
			<div className="flex items-center justify-between px-4 py-3.5">
				<span className="text-sm font-semibold">Agents</span>
				<Button
					variant="ghost"
					size="sm"
					className="rounded-full bg-background/70 px-2.5 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
					onClick={handleCreate}
				>
					+ Agent
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="px-3 pb-3">
					<AgentList components={{ Item: AgentSidebarItem, Empty }} />
				</div>
			</ScrollArea>
		</div>
	);
}
