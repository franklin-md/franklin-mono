import type { ComponentPropsWithoutRef } from 'react';
import { Command } from '../../../primitives/command.js';
import { cn } from '../../../lib/cn.js';
import { useModelPicker } from './context.js';

type Props = ComponentPropsWithoutRef<typeof Command>;

export function ModelPickerModels({ className, ...props }: Props) {
	const { view } = useModelPicker();
	return (
		<div hidden={view !== 'models'} className="min-h-0 overflow-hidden">
			<Command className={cn('min-h-0', className)} {...props} />
		</div>
	);
}
