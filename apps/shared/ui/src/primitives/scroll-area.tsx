import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '../lib/cn.js';

const ScrollRoot = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn('relative overflow-hidden', className)}
		{...props}
	>
		{children}
	</ScrollAreaPrimitive.Root>
));
ScrollRoot.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollViewport = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Viewport>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>
>(({ className, ...props }, ref) => (
	<ScrollAreaPrimitive.Viewport
		ref={ref}
		className={cn('h-full w-full rounded-[inherit]', className)}
		{...props}
	/>
));
ScrollViewport.displayName = ScrollAreaPrimitive.Viewport.displayName;

const ScrollArea = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ children, ...props }, ref) => (
	<ScrollRoot ref={ref} {...props}>
		<ScrollViewport>{children}</ScrollViewport>
		<ScrollBar />
		<ScrollCorner />
	</ScrollRoot>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		ref={ref}
		orientation={orientation}
		className={cn(
			'flex touch-none select-none transition-colors',
			orientation === 'vertical' && 'top-1.5 bottom-1.5 right-1 w-3 p-[2px]',
			orientation === 'horizontal' &&
				'bottom-1 left-1.5 right-1.5 h-3 flex-col p-[2px]',
			className,
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-ring/70 dark:bg-white/18" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

const ScrollCorner = ScrollAreaPrimitive.Corner;

export { ScrollArea, ScrollBar, ScrollCorner, ScrollRoot, ScrollViewport };
