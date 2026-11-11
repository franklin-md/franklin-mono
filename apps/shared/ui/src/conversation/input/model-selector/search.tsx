import type { ComponentPropsWithoutRef } from 'react';
import { CommandInput } from '../../../primitives/command.js';
import { cn } from '../../../lib/cn.js';

type Props = ComponentPropsWithoutRef<typeof CommandInput>;

export function ModelPickerSearch({ className, ...props }: Props) {
	return (
		<CommandInput
			aria-label="Search models"
			placeholder="Search models..."
			className={cn('text-xs', className)}
			{...props}
		/>
	);
}
