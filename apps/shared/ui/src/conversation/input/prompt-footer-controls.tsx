import type { ComponentPropsWithoutRef } from 'react';

import { PromptControls } from '@franklin/react';

import { cn } from '../../lib/cn.js';

export type PromptFooterControlsProps = ComponentPropsWithoutRef<'div'>;

export function PromptFooterControls({
	children,
	className,
	...props
}: PromptFooterControlsProps) {
	return (
		<PromptControls>
			<div
				className={cn(
					'flex w-full items-center justify-between gap-3',
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</PromptControls>
	);
}

export type PromptFooterControlGroupProps = ComponentPropsWithoutRef<'div'>;

export function PromptFooterControlGroup({
	children,
	className,
	...props
}: PromptFooterControlGroupProps) {
	return (
		<div className={cn('flex items-center gap-2', className)} {...props}>
			{children}
		</div>
	);
}
