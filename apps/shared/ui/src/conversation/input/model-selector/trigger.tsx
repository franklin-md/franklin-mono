import { ChevronDown } from 'lucide-react';
import { Button } from '../../../primitives/button.js';
import type { ButtonProps } from '../../../primitives/button.js';
import { PopoverTrigger } from '../../../primitives/popover.js';
import { cn } from '../../../lib/cn.js';
import { ModelIcon } from '../provider-icons.js';
import { useModelPicker } from './context.js';

export function ModelPickerTrigger({
	children,
	className,
	...props
}: ButtonProps) {
	const { provider, model, selectedEntry } = useModelPicker();
	return (
		<PopoverTrigger asChild>
			<Button
				type="button"
				title={`${provider} · ${model}`}
				variant="ghost"
				size="sm"
				className={cn(
					'h-auto min-w-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground',
					className,
				)}
				{...props}
			>
				{children ?? (
					<>
						{selectedEntry && (
							<ModelIcon model={selectedEntry} className="h-3.5 w-3.5" />
						)}
						<span className="max-w-[140px] truncate">
							{selectedEntry?.name ?? (model || 'Select model')}
						</span>
						<ChevronDown className="h-3 w-3 opacity-50" />
					</>
				)}
			</Button>
		</PopoverTrigger>
	);
}
