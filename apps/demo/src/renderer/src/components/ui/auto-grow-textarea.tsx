import { forwardRef } from 'react';

import TextareaAutosize from 'react-textarea-autosize';
import type { TextareaAutosizeProps } from 'react-textarea-autosize';

import { cn } from '@/lib/utils';

import { textareaClassName } from './textarea.js';

type AutoGrowTextareaProps = Omit<
	TextareaAutosizeProps,
	'minRows' | 'maxRows'
> & {
	minLines?: number;
	maxLines?: number;
};

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
	({ className, minLines = 2, maxLines, ...props }, externalRef) => {
		return (
			<TextareaAutosize
				ref={externalRef}
				minRows={minLines}
				maxRows={maxLines}
				className={cn(textareaClassName, 'resize-none min-h-0', className)}
				{...props}
			/>
		);
	},
);
AutoGrowTextarea.displayName = 'AutoGrowTextarea';

export { AutoGrowTextarea };
