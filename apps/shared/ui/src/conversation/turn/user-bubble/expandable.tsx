import { useId, useState } from 'react';
import type { MouseEvent } from 'react';

import { cn } from '../../../lib/cn.js';
import { UserBubbleContent } from './content.js';
import { UserBubbleFooter } from './footer.js';
import { useContentOverflow } from './use-overflow.js';

interface ExpandableBubbleProps {
	text: string;
}

export function ExpandableBubble({ text }: ExpandableBubbleProps) {
	const [expanded, setExpanded] = useState(false);
	const { canExpand, contentRef } = useContentOverflow(text);
	const contentId = useId();

	function toggle() {
		setExpanded((value) => !value);
	}

	function handleBubbleClick(event: MouseEvent<HTMLDivElement>) {
		if (canExpand && shouldToggleOnClick(event)) toggle();
	}

	function handleContentFocus() {
		// Keyboard navigation to a clipped link must reveal its content.
		if (canExpand) setExpanded(true);
	}

	return (
		<div
			className={cn(
				'min-w-0 break-words rounded-lg bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-ring',
				canExpand && 'cursor-pointer',
			)}
			onClick={handleBubbleClick}
		>
			<UserBubbleContent
				text={text}
				contentId={contentId}
				contentRef={contentRef}
				expanded={expanded}
				onFocusCapture={handleContentFocus}
			/>
			{canExpand && (
				<UserBubbleFooter
					contentId={contentId}
					expanded={expanded}
					onToggle={toggle}
				/>
			)}
		</div>
	);
}

function shouldToggleOnClick(event: MouseEvent<HTMLDivElement>): boolean {
	const target = event.target as Element;
	if (
		target.closest(
			'a, button, input, textarea, select, summary, [role="button"], [contenteditable]',
		)
	)
		return false;

	const selection = event.currentTarget.ownerDocument.getSelection();
	return !(
		selection &&
		!selection.isCollapsed &&
		selection.rangeCount > 0 &&
		selection.getRangeAt(0).intersectsNode(event.currentTarget)
	);
}
