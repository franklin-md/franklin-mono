import type { ComponentType } from 'react';

import { AgentProvider } from './agent-context.js';
import { useAgents } from './agents-context.js';

export type AgentItemProps = {
	sessionId: string;
	isActive: boolean;
	onSelect: () => void;
	onRemove: () => void;
};

export type AgentListComponents = {
	Item: ComponentType<AgentItemProps>;
	Empty?: ComponentType<object>;
};

/**
 * Headless agent-list renderer.
 *
 * Reads sessions and selection state from `<AgentsProvider>`, wraps each
 * item in `<AgentProvider>` so the app's `Item` component can access
 * per-agent state via `useAgentState`, and delegates all rendering to
 * the app-provided `components`.
 */
export function AgentList({ components }: { components: AgentListComponents }) {
	const { sessions, activeSessionId, select, remove } = useAgents();
	const { Item, Empty } = components;

	if (sessions.length === 0) {
		return Empty ? <Empty /> : null;
	}

	return (
		<>
			{sessions.map((session) => (
				<AgentProvider key={session.id} agent={session.runtime}>
					<Item
						sessionId={session.id}
						isActive={session.id === activeSessionId}
						onSelect={() => select(session.id)}
						onRemove={() => remove(session.id)}
					/>
				</AgentProvider>
			))}
		</>
	);
}
