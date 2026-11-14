import type { UserMessage } from '@franklin/mini-acp';
import { ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../../primitives/button.js';
import { referenceMentionMarkdown } from '../reference-mention/markdown.js';
import { Markdown } from './markdown.js';

interface UserBubbleProps {
	message: UserMessage;
}

export function UserBubble({ message }: UserBubbleProps) {
	const [expanded, setExpanded] = useState(false);
	const [canExpand, setCanExpand] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const contentId = useId();
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	useEffect(() => {
		const content = contentRef.current;
		const markdown = content?.firstElementChild;
		if (!content || !markdown) return;

		const measure = () => {
			const previewHeight =
				parseFloat(getComputedStyle(content).lineHeight) * 3;
			setCanExpand(markdown.getBoundingClientRect().height > previewHeight);
		};
		measure();
		if (typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver(measure);
		// Measure the full Markdown independently of the animated viewport so
		// opening/closing cannot temporarily hide the toggle.
		observer.observe(markdown);
		return () => observer.disconnect();
	}, [text]);

	return (
		<div
			className={cn(
				'min-w-0 break-words rounded-lg bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-ring',
				canExpand && 'cursor-pointer',
			)}
			onClick={(event) => {
				if (!canExpand) return;
				const target = event.target as Element;
				if (
					target.closest(
						'a, button, input, textarea, select, summary, [role="button"], [contenteditable]',
					)
				)
					return;
				const selection = event.currentTarget.ownerDocument.getSelection();
				if (
					selection &&
					!selection.isCollapsed &&
					selection.rangeCount > 0 &&
					selection.getRangeAt(0).intersectsNode(event.currentTarget)
				)
					return;
				setExpanded((value) => !value);
			}}
		>
			<div
				id={contentId}
				ref={contentRef}
				// Opt in locally to numeric/intrinsic size interpolation; older engines
				// retain the same disclosure behavior without motion.
				// https://developer.chrome.com/docs/css-ui/animate-to-height-auto
				className={cn(
					'overflow-hidden transition-[max-height] duration-200 ease-out [interpolate-size:allow-keywords] motion-reduce:transition-none',
					expanded ? 'max-h-max' : 'max-h-[3lh]',
				)}
				onFocusCapture={() => {
					// Keyboard navigation to a clipped link must reveal its content.
					if (canExpand) setExpanded(true);
				}}
			>
				<Markdown
					text={text}
					className="prose-content"
					{...referenceMentionMarkdown}
				/>
			</div>
			{canExpand && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="mt-1 h-6 gap-1 px-1 text-muted-foreground"
					aria-expanded={expanded}
					aria-controls={contentId}
					onClick={() => setExpanded((value) => !value)}
				>
					<ChevronRight
						aria-hidden="true"
						className={cn(
							'size-3 transition-transform duration-200 ease-out motion-reduce:transition-none',
							expanded && 'rotate-90',
						)}
					/>
					{expanded ? 'Show less' : 'Show more'}
				</Button>
			)}
		</div>
	);
}
