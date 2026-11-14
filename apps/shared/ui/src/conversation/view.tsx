import { useMemo, type ReactNode } from 'react';

import type { ConversationTurn } from '@franklin/agent';
import {
	Conversation,
	createTurnEndBlock,
	createToolUseBlock,
	useAutoFollow,
	useFirstMountEffect,
	useTriggerOnChange,
	type ConversationRenderTurn,
	type ConversationComponents,
	type ConversationActivityProps,
	type ToolRendererRegistry,
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
import { ConversationActivity } from './activity/conversation.js';
import { ToolCardChrome } from './tools/chrome.js';
import { defaultToolRegistry } from './tools/registry/index.js';

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

const ActivityWaiting = ({ turn }: { turn: ConversationRenderTurn }) =>
	turn.response.blocks.some(
		(block) => block.kind === 'thinking' || block.kind === 'toolUse',
	) ? null : (
		<Waiting turn={turn} />
	);

const defaultComponents = {
	Text: TextBlock,
	Thinking: ThinkingBlock,
	TurnEnd,
	UserMessage,
	Turn: TurnChrome,
	AssistantMessage: AssistantChrome,
	Waiting: ActivityWaiting,
	Footer: TurnFooter,
	EmptyPlaceholder: DefaultEmptyConversationPlaceholder,
} satisfies Partial<ConversationComponents>;

export interface ConversationViewProps {
	turns: ConversationTurn[];
	components?: Partial<ConversationComponents>;
	toolRegistry?: ToolRendererRegistry;
}

export function ConversationView({
	turns,
	components: componentOverrides,
	toolRegistry = defaultToolRegistry,
}: ConversationViewProps) {
	const autoFollow = useAutoFollow<HTMLDivElement>();
	const toolComponents = useMemo(
		() => ({
			ToolUse: createToolUseBlock(toolRegistry, ToolCardChrome),
			Activity: (props: ConversationActivityProps) => (
				<ConversationActivity {...props} registry={toolRegistry} />
			),
		}),
		[toolRegistry],
	);

	const components = useMemo<ConversationComponents>(
		() => ({ ...defaultComponents, ...toolComponents, ...componentOverrides }),
		[componentOverrides, toolComponents],
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
