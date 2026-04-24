import { useMemo, type ComponentType, type ReactNode } from 'react';

import type { ConversationTurn, ToolUseBlock } from '@franklin/extensions';
import {
	Conversation,
	createTurnEndBlock,
	useAutoFollow,
	useFollowKey,
	type ConversationComponents,
	type ToolStatus,
} from '@franklin/react';

import {
	ScrollBar,
	ScrollCorner,
	ScrollRoot,
	ScrollViewport,
} from '../primitives/scroll-area.js';

import { TextBlock } from './turn/text/text.js';
import { ThinkingBlock } from './turn/thinking.js';
import { defaultRegistry } from './turn/turn-end/registry.js';
import { UserBubble } from './turn/user-bubble.js';

const TurnEnd = createTurnEndBlock(defaultRegistry);

const TurnChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-4">{children}</div>
);

const AssistantChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-1.5">{children}</div>
);

const DefaultToolUse = ({
	block,
}: {
	block: ToolUseBlock;
	status: ToolStatus;
}) => <div className="text-xs text-muted-foreground">{block.call.name}</div>;

const defaultComponents: ConversationComponents = {
	Text: TextBlock,
	Thinking: ThinkingBlock,
	ToolUse: DefaultToolUse,
	TurnEnd,
	UserMessage: UserBubble,
	Turn: TurnChrome,
	AssistantMessage: AssistantChrome,
};

export interface ConversationViewProps {
	turns: ConversationTurn[];
	toolUse?: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
}

export function ConversationView({ turns, toolUse }: ConversationViewProps) {
	const autoFollow = useAutoFollow<HTMLDivElement>();

	const components = useMemo(
		() =>
			toolUse ? { ...defaultComponents, ToolUse: toolUse } : defaultComponents,
		[toolUse],
	);

	// Behaviour: On each new turn start, we refocus to bottom
	const resetKey = turns.at(-1)?.id;
	useFollowKey(resetKey, autoFollow.follow);

	return (
		<ScrollRoot className="min-w-0 flex-1">
			<ScrollViewport
				ref={autoFollow.viewportRef}
				className="p-4"
				onScroll={autoFollow.handleScroll}
			>
				<div
					ref={autoFollow.contentRef}
					className="mx-auto flex w-full min-w-0 max-w-prose flex-col gap-10 pt-6"
				>
					{turns.length === 0 && (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Send a message to start the conversation.
						</p>
					)}
					<Conversation turns={turns} components={components} />
				</div>
			</ScrollViewport>
			<ScrollBar />
			<ScrollCorner />
		</ScrollRoot>
	);
}
