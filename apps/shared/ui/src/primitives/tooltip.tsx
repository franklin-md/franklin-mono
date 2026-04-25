import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '../lib/cn.js';
import { usePortalContainer } from '../lib/portal-container.js';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
	React.ComponentRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => {
	const container = usePortalContainer();
	return (
		<TooltipPrimitive.Portal container={container}>
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn(
					'z-50 rounded-lg bg-popover p-0 text-popover-foreground shadow-md outline-none',
					'ring-1 ring-border',
					'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
					'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
					'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
					className,
				)}
				{...props}
			/>
		</TooltipPrimitive.Portal>
	);
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
