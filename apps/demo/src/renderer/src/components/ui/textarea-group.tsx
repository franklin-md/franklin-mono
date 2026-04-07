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
				'flex flex-col gap-3 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-inset ring-ring/70 transition-colors focus-within:ring-ring dark:bg-white/[0.08]',
				className,
			)}
		>
			<AutoGrowTextarea
				className="flex-1 bg-transparent px-4 pt-4 pb-0 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
				minLines={minLines}
				maxLines={maxLines}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<div className="flex items-center justify-between pl-4 pr-3 pb-3">
				{buttonBar}
			</div>
		</div>
	);
}
