import { forwardRef, type ComponentType } from 'react';

import { cn } from '../lib/cn.js';
import { Button, type ButtonProps } from '../primitives/button.js';

export interface IconButtonProps extends Omit<
	ButtonProps,
	'children' | 'size'
> {
	icon: ComponentType<{ className?: string }>;
	iconClassName?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{ icon: Icon, iconClassName, variant = 'ghost', className, ...props },
		ref,
	) => {
		return (
			<Button
				ref={ref}
				variant={variant}
				size="icon"
				className={cn('h-7 w-7', className)}
				{...props}
			>
				<Icon className={cn('h-3.5 w-3.5', iconClassName)} />
			</Button>
		);
	},
);
IconButton.displayName = 'IconButton';
