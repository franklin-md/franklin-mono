import { ChevronDown } from 'lucide-react';
import { Button } from '../../../primitives/button.js';
import type { ButtonProps } from '../../../primitives/button.js';
import type { ThinkingLevel } from '@franklin/mini-acp';
import { PopoverTrigger } from '../../../primitives/popover.js';
import { cn } from '../../../lib/cn.js';
import { ModelIcon } from '../provider-icons.js';
import { useModelPicker } from './context.js';
import { EFFORT_LABELS } from './effort-labels.js';

type Props = ButtonProps & { effort?: ThinkingLevel };

export function ModelPickerTrigger({
	children,
	className,
	effort,
	...props
}: Props) {
	const { provider, model, selectedEntry } = useModelPicker();
	const effortLabel = effort === undefined ? undefined : EFFORT_LABELS[effort];
	return (
		<PopoverTrigger asChild>
			<Button
				type="button"
				title={`${provider} · ${model}${effortLabel ? ` · ${effortLabel.label}` : ''}`}
				aria-description={
					effortLabel ? `Thinking: ${effortLabel.label}` : undefined
				}
				variant="ghost"
				size="sm"
				className={cn(
					'h-auto min-w-0 gap-1.5 px-2 py-1 text-[length:calc(var(--text-xs)-1px)] text-muted-foreground',
					className,
				)}
				{...props}
			>
				{children ?? (
					<>
						{selectedEntry && (
							<ModelIcon model={selectedEntry} className="h-3.5 w-3.5" />
						)}
						<span className="min-w-0 max-w-[140px] truncate text-foreground">
							{selectedEntry?.name ?? (model || 'Select model')}
						</span>
						{effortLabel && (
							<span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
								<span aria-hidden="true">·</span>
								{effortLabel.shortLabel}
							</span>
						)}
						<ChevronDown className="h-3 w-3 opacity-50" />
					</>
				)}
			</Button>
		</PopoverTrigger>
	);
}
