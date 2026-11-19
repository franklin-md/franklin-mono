import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as React from 'react';

import { cn } from '../lib/cn.js';

const RadioGroup = React.forwardRef<
	React.ComponentRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Root
		ref={ref}
		className={cn('grid gap-2', className)}
		{...props}
	/>
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

// Changed from shadcn's RadioGroupItem (https://ui.shadcn.com/docs/components/radio-group):
// shadcn draws a bordered circle with an Indicator dot and ignores children.
// Franklin's radio choices are compact pills, such as color swatches, so the
// item renders its children and marks the checked choice with a background.
// The focus outline is an inset ring rather than shadcn's offset ring.
const RadioGroupItem = React.forwardRef<
	React.ComponentRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Item
		ref={ref}
		className={cn(
			'flex shrink-0 cursor-pointer select-none items-center justify-center rounded-md outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-muted data-[state=unchecked]:hover:bg-accent',
			className,
		)}
		{...props}
	/>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
