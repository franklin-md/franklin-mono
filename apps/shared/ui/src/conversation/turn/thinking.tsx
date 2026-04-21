import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { ThinkingBlock as ThinkingBlockData } from '@franklin/extensions';

import { cn } from '../../lib/cn.js';
import { Button } from '../../primitives/button.js';

import { Markdown } from './markdown.js';

export function ThinkingBlock({ block }: { block: ThinkingBlockData }) {
	const streaming = block.endedAt === undefined;
	const [expanded, setExpanded] = useState(streaming);

	useEffect(() => {
		if (!streaming) setExpanded(false);
	}, [streaming]);

	return (
		<div className="text-xs">
			<Button
				type="button"
				variant="ghost"
				className="h-auto w-full cursor-pointer appearance-none justify-start gap-2 rounded-md border-0 bg-transparent px-1 py-1 text-left text-xs font-normal text-muted-foreground shadow-none"
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
			>
				<ChevronRight
					className={cn(
						'h-3 w-3 shrink-0 transition-transform duration-150',
						expanded && 'rotate-90',
					)}
				/>
				<span>{headerLabel(block, streaming)}</span>
			</Button>
			{expanded && (
				<div className="px-1 pb-1 pt-0.5 text-sm text-muted-foreground/80 italic">
					<Markdown text={block.text} />
				</div>
			)}
		</div>
	);
}

function headerLabel(block: ThinkingBlockData, streaming: boolean): string {
	if (streaming) return 'Thinking…';
	const elapsedSeconds = Math.round(
		((block.endedAt ?? block.startedAt) - block.startedAt) / 1000,
	);
	return elapsedSeconds > 0 ? `Thought for ${elapsedSeconds}s` : 'Thought';
}
