import { useEffect, useRef, type ReactNode } from 'react';

import type { ConversationTurn } from '@franklin/extensions';
import {
	Conversation,
	createTurnEndBlock,
	type ConversationComponents,
} from '@franklin/react';

import { ScrollArea } from '@/components/ui/scroll-area';

import { TextBlock } from '../turn/body/blocks/text/text.js';
import { ThinkingBlock } from '../turn/body/blocks/thinking.js';
import { defaultRegistry } from '../turn/body/blocks/turn-end/registry.js';
import { UserBubble } from '../turn/body/user-bubble.js';
import { ToolUse } from '../tools/tool-use.js';

const TurnEnd = createTurnEndBlock(defaultRegistry);

const TurnChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-4">{children}</div>
);

const AssistantChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-1.5">{children}</div>
);

const components: ConversationComponents = {
	Text: TextBlock,
	Thinking: ThinkingBlock,
	ToolUse,
	TurnEnd,
	UserMessage: UserBubble,
	Turn: TurnChrome,
	AssistantMessage: AssistantChrome,
};

export function ConversationView({ turns }: { turns: ConversationTurn[] }) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [turns]);

	return (
		<ScrollArea className="flex-1 p-4">
			<div className="mx-auto flex max-w-prose flex-col gap-10 pt-6">
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
