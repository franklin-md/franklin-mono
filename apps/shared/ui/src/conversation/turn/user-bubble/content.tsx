import type { FocusEventHandler, RefObject } from 'react';

import { cn } from '../../../lib/cn.js';
import { referenceMentionMarkdown } from '../../reference-mention/markdown.js';
import { Markdown } from '../markdown.js';

interface UserBubbleContentProps {
	text: string;
	contentId: string;
	contentRef: RefObject<HTMLDivElement>;
	expanded: boolean;
	onFocusCapture: FocusEventHandler<HTMLDivElement>;
}

export function UserBubbleContent({
	text,
	contentId,
	contentRef,
	expanded,
	onFocusCapture,
}: UserBubbleContentProps) {
	return (
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
			onFocusCapture={onFocusCapture}
		>
			<Markdown
				text={text}
				className="prose-content"
				{...referenceMentionMarkdown}
			/>
		</div>
	);
}
