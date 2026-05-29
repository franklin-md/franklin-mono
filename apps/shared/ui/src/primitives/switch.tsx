import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '../lib/cn.js';

export type SwitchProps = React.ComponentPropsWithoutRef<
	typeof SwitchPrimitive.Root
> & {
	thumbClassName?: string;
};

const Switch = React.forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	SwitchProps
>(({ className, thumbClassName, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		className={cn(
			'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-start rounded-full box-border bg-input p-0.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
				thumbClassName,
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
