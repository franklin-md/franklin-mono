import { useAgentSession } from './use-agent-session.js';
import { ConversationPanel } from './conversation/index.js';
import { TodoPanel } from './todo/index.js';

export function AgentChatPage() {
	const { commands, sessionId, todoExt, conversationExt, status, error } =
		useAgentSession();

	if (status === 'loading') {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Starting agent...
			</div>
		);
	}

	if (status === 'error') {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-destructive">
				Failed to start agent: {error}
			</div>
		);
	}

	// sessionId is always defined when status is 'ready'
	if (!sessionId) return null;

	return (
		<div className="flex flex-1 overflow-hidden">
			<ConversationPanel
				conversationExt={conversationExt}
				commands={commands}
				sessionId={sessionId}
			/>
			<TodoPanel todoExt={todoExt} />
		</div>
	);
}
