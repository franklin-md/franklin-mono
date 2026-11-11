import type { ComponentPropsWithoutRef } from 'react';
import { Command } from '../../../primitives/command.js';
import { cn } from '../../../lib/cn.js';

type Props = ComponentPropsWithoutRef<typeof Command>;

export function ModelPickerModels({ className, ...props }: Props) {
	return <Command className={cn('min-h-0', className)} {...props} />;
}
