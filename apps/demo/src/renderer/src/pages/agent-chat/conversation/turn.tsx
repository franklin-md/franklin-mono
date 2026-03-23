import type { ConversationTurn } from '@franklin/agent/browser';

import { UserBubble } from './user-bubble.js';
import { AgentBubble } from './agent-bubble.js';
import { ToolCallCard } from './tool-call-card.js';

export function Turn({ turn }: { turn: ConversationTurn }) {
	return (
		<div className="flex flex-col gap-2">
			{turn.entries.map((entry, i) => {
				switch (entry.type) {
					case 'user':
						return <UserBubble key={i} entry={entry} />;
					case 'text':
						return <AgentBubble key={i} entry={entry} />;
					case 'toolCall':
						return <ToolCallCard key={i} entry={entry} />;
					case 'thought':
						return null;
				}
			})}
		</div>
	);
}
