import { AgentProvider, useAgents, type AgentsControl } from '@franklin/react';
import { Plus } from 'lucide-react';

import { Button } from '../primitives/button.js';
import { Tabs, TabsList } from '../primitives/tabs.js';
import { AgentTabsItem } from './item.js';

type AgentCreateOverrides = NonNullable<
	NonNullable<Parameters<AgentsControl['create']>[0]>['overrides']
>;

type AgentTabsProps = {
	getCreateOverrides?: () => AgentCreateOverrides;
	ariaLabel?: string;
};

export function AgentTabs({
	getCreateOverrides,
	ariaLabel = 'Agents',
}: AgentTabsProps) {
	const { sessions, activeSessionId, select, create, remove } = useAgents();

	function handleCreate() {
		const overrides = getCreateOverrides?.();
		void create(overrides ? { overrides } : undefined);
	}

	return (
		<div className="flex items-end gap-2 border-b border-border px-4 pt-2">
			<div className="min-w-0 flex-1 overflow-x-auto">
				<Tabs
					value={activeSessionId ?? ''}
					onValueChange={select}
					aria-label={ariaLabel}
				>
					<TabsList className="h-8 w-max min-w-full justify-start gap-0.5 rounded-none bg-transparent p-0">
						{sessions.map((session, index) => (
							<AgentProvider key={session.id} agent={session.runtime}>
								<AgentTabsItem
									label={String(index + 1)}
									sessionId={session.id}
									isActive={session.id === activeSessionId}
									onSelect={() => select(session.id)}
									onRemove={() => remove(session.id)}
								/>
							</AgentProvider>
						))}
					</TabsList>
				</Tabs>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="mb-1 h-7 w-7 shrink-0 rounded-md"
				aria-label="Create agent"
				onClick={handleCreate}
			>
				<Plus className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}
