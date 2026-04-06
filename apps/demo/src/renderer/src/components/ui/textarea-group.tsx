import type { ReactNode } from 'react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { AutoGrowTextarea } from './auto-grow-textarea.js';

export interface TextareaGroupProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	disabled?: boolean;
	minLines?: number;
	maxLines?: number;
	buttonBar: ReactNode;
	className?: string;
}

export function TextareaGroup({
	value,
	onChange,
	onSubmit,
	placeholder,
	disabled,
	minLines = 2,
	maxLines = 10,
	buttonBar,
	className,
}: TextareaGroupProps) {
	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSubmit();
		}
	}

	return (
		<div
			className={cn(
				'flex flex-col rounded-md ring-1 ring-inset ring-border bg-background focus-within:ring-2 focus-within:ring-ring',
				className,
			)}
		>
			<AutoGrowTextarea
				className="flex-1 bg-transparent px-3 pt-2.5 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
				minLines={minLines}
				maxLines={maxLines}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<div className="flex items-center justify-between px-2 pb-2">
				{buttonBar}
			</div>
		</div>
	);
}
