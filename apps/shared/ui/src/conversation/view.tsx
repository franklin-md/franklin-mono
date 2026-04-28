import { useMemo, type ReactNode } from 'react';

import type { ConversationTurn, ToolUseBlock } from '@franklin/extensions';
import {
	Conversation,
	createTurnEndBlock,
	useAutoFollow,
	useFirstMountEffect,
	useTriggerOnChange,
	type ConversationRenderTurn,
	type ConversationComponents,
	type ToolStatus,
} from '@franklin/react';

import {
	ScrollBar,
	ScrollCorner,
	ScrollRoot,
	ScrollViewport,
} from '../primitives/scroll-area.js';

import { DefaultEmptyConversationPlaceholder } from './default-empty-placeholder.js';
import { TextBlock } from './turn/text/text.js';
import { ThinkingBlock } from './turn/thinking.js';
import { TurnFooter } from './turn/footer/index.js';
import { defaultRegistry } from './turn/turn-end/registry.js';
import { UserBubble } from './turn/user-bubble.js';
import { Waiting } from './turn/waiting.js';

const TurnEnd = createTurnEndBlock(defaultRegistry);

const TurnChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-4">{children}</div>
);

const AssistantChrome = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-col gap-1.5">{children}</div>
);

const UserMessage = ({ turn }: { turn: ConversationRenderTurn }) => (
	<UserBubble message={turn.prompt} />
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
	UserMessage,
	Turn: TurnChrome,
	AssistantMessage: AssistantChrome,
	Waiting,
	Footer: TurnFooter,
	EmptyPlaceholder: DefaultEmptyConversationPlaceholder,
};

export interface ConversationViewProps {
	turns: ConversationTurn[];
	components?: Partial<ConversationComponents>;
}

export function ConversationView({
	turns,
	components: componentOverrides,
}: ConversationViewProps) {
	const autoFollow = useAutoFollow<HTMLDivElement>();

	const components = useMemo<ConversationComponents>(
		() =>
			componentOverrides
				? { ...defaultComponents, ...componentOverrides }
				: defaultComponents,
		[componentOverrides],
	);

	// Behaviour: Go to bottom on mount (i.e. switch to this tab)
	useFirstMountEffect(() => {
		if (turns.length > 0) autoFollow.follow();
	});

	// Behaviour: On each new turn start, we refocus to bottom
	const resetKey = turns.at(-1)?.id;
	useTriggerOnChange(resetKey, autoFollow.follow);

	return (
		<ScrollRoot className="min-w-0 flex-1">
			<ScrollViewport
				ref={autoFollow.viewportRef}
				// Radix's table wrapper can expand horizontally around chat content.
				className="p-4 [&>div]:!block"
				onScroll={autoFollow.handleScroll}
			>
				<div
					ref={autoFollow.contentRef}
					className="mx-auto flex w-full min-w-0 max-w-3xl select-text flex-col gap-10 pt-6"
				>
					<Conversation turns={turns} components={components} />
				</div>
			</ScrollViewport>
			<ScrollBar />
			<ScrollCorner />
		</ScrollRoot>
	);
}
