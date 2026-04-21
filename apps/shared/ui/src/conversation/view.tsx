import {
	useEffect,
	useMemo,
	useRef,
	type ComponentType,
	type ReactNode,
} from 'react';

import type { ConversationTurn, ToolUseBlock } from '@franklin/extensions';
import {
	Conversation,
	createTurnEndBlock,
	type ConversationComponents,
	type ToolStatus,
} from '@franklin/react';

import { ScrollArea } from '../primitives/scroll-area.js';

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
	const bottomRef = useRef<HTMLDivElement>(null);

	const components = useMemo(
		() =>
			toolUse ? { ...defaultComponents, ToolUse: toolUse } : defaultComponents,
		[toolUse],
	);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [turns]);

	return (
		<ScrollArea className="min-w-0 flex-1 p-4">
			<div className="mx-auto flex w-full min-w-0 max-w-prose flex-col gap-10 pt-6">
				{turns.length === 0 && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Send a message to start the conversation.
					</p>
				)}
				<Conversation turns={turns} components={components} />
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	);
}
