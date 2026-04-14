import { forwardRef } from 'react';

import TextareaAutosize from 'react-textarea-autosize';
import type { TextareaAutosizeProps } from 'react-textarea-autosize';

import { useTextareaAutosizeLayout } from '@franklin/react';

import { cn } from '../lib/cn.js';

import { ScrollArea } from '../primitives/scroll-area.js';
import { textareaClassName } from '../primitives/textarea.js';

type AutoGrowTextareaProps = Omit<
	TextareaAutosizeProps,
	'minRows' | 'maxRows'
> & {
	minLines?: number;
	maxLines?: number;
};

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
	(
		{ className, minLines = 2, maxLines, onHeightChange, style, ...props },
		externalRef,
	) => {
		const layout = useTextareaAutosizeLayout({
			minRows: minLines,
			maxRows: maxLines,
			ref: externalRef,
		});

		const textarea = (
			<TextareaAutosize
				ref={layout.textareaRef}
				minRows={layout.minRows}
				onHeightChange={(height, meta) => {
					layout.handleHeightChange(height, meta);
					onHeightChange?.(height, meta);
				}}
				style={style}
				className={cn(
					textareaClassName,
					'min-h-0 resize-none overflow-hidden',
					className,
				)}
				{...props}
			/>
		);

		if (!maxLines) {
			return textarea;
		}

		return (
			<ScrollArea
				type={layout.isOverflowing ? 'always' : 'hover'}
				className="w-full overflow-hidden rounded-[inherit]"
				style={{
					height: layout.visibleHeight
						? `${layout.visibleHeight}px`
						: undefined,
					minHeight: `${layout.minRows}lh`,
				}}
			>
				<div className="w-full pr-4">{textarea}</div>
			</ScrollArea>
		);
	},
);
AutoGrowTextarea.displayName = 'AutoGrowTextarea';

export { AutoGrowTextarea };
