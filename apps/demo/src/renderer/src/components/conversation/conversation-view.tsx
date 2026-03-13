import { useEffect, useRef } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import type { AgentSessionSnapshot } from '@franklin/react-agents/browser';
import { useConversation } from '@/hooks/use-conversation';
import { MessageBubble } from './message-bubble';
import { PlanPanel } from './plan-panel';
import { ThoughtBlock } from './thought-block';
import { ToolCallCard } from './tool-call-card';
import { UsageBar } from './usage-bar';

export interface ConversationViewProps {
	snapshot: AgentSessionSnapshot;
	className?: string;
}

export function ConversationView({
	snapshot,
	className,
}: ConversationViewProps) {
	const state = useConversation(snapshot);
	const bottomRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const isUserScrolledUp = useRef(false);

	// Track whether user has scrolled up to avoid fighting with auto-scroll
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = el;
			isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 50;
		};

		el.addEventListener('scroll', handleScroll, { passive: true });
		return () => el.removeEventListener('scroll', handleScroll);
	}, []);

	// Auto-scroll to bottom on new items (unless user scrolled up)
	useEffect(() => {
		if (!isUserScrolledUp.current) {
			bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [state.items.length, state.isStreaming]);

	if (state.items.length === 0 && !state.usage) {
		return null;
	}

	return (
		<div className={cn('flex flex-col', className)}>
			<ScrollArea className="flex-1">
				<div ref={scrollRef} className="space-y-3 p-4">
					{state.items.map((item, i) => {
						switch (item.kind) {
							case 'message':
								return <MessageBubble key={item.data.id} message={item.data} />;
							case 'thought':
								return <ThoughtBlock key={item.data.id} thought={item.data} />;
							case 'tool_call':
								return (
									<ToolCallCard
										key={item.data.toolCallId}
										toolCall={item.data}
									/>
								);
							case 'plan':
								return <PlanPanel key={`plan-${i}`} plan={item.data} />;
						}
					})}
					<div ref={bottomRef} />
				</div>
			</ScrollArea>

			{state.usage && (
				<div className="shrink-0 border-t px-4 py-2">
					<UsageBar usage={state.usage} />
				</div>
			)}
		</div>
	);
}
