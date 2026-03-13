import { Brain, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import type { ConversationThought } from '@/lib/conversation';

export interface ThoughtBlockProps {
	thought: ConversationThought;
}

export function ThoughtBlock({ thought }: ThoughtBlockProps) {
	const [isOpen, setIsOpen] = useState(thought.isStreaming);

	return (
		<div className="rounded-lg border border-dashed border-muted-foreground/30">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronRight
					className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
				/>
				<Brain className="h-3.5 w-3.5" />
				<span className="italic">
					{thought.isStreaming ? 'Thinking...' : 'Thought'}
				</span>
				{thought.isStreaming && (
					<span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-muted-foreground" />
				)}
			</button>

			{isOpen && (
				<div className="border-t border-dashed border-muted-foreground/30 px-4 py-3">
					<p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
						{thought.text}
					</p>
				</div>
			)}
		</div>
	);
}
