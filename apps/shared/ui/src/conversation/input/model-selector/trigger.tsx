import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';
import type { ThinkingLevel } from '@franklin/mini-acp';
import { Button } from '../../../primitives/button.js';
import type { ButtonProps } from '../../../primitives/button.js';
import { cn } from '../../../lib/cn.js';
import type { ProviderGroup } from '../models/catalog.js';
import { ModelIcon } from '../provider-icons.js';
import { EFFORT_LABELS } from './effort-labels.js';
import type { ModelValue } from './types.js';

type Props = Omit<ButtonProps, 'value' | 'children'> & {
	value: ModelValue;
	catalog: readonly ProviderGroup[];
	effort?: ThinkingLevel;
};

// A plain button summarizing the current model, so callers can wrap it in
// PopoverTrigger asChild or another container's trigger.
export const ModelTrigger = forwardRef<HTMLButtonElement, Props>(
	function ModelTrigger({ value, catalog, effort, className, ...props }, ref) {
		const entry = catalog
			.flatMap((group) => group.models)
			.find(
				(model) =>
					model.id === value.model && model.provider === value.provider,
			);
		const effortLabel =
			effort === undefined ? undefined : EFFORT_LABELS[effort];
		return (
			<Button
				ref={ref}
				type="button"
				title={`${value.provider} · ${value.model}${effortLabel ? ` · ${effortLabel.label}` : ''}`}
				aria-description={
					effortLabel ? `Thinking: ${effortLabel.label}` : undefined
				}
				variant="ghost"
				size="sm"
				className={cn(
					'h-auto min-w-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground',
					className,
				)}
				{...props}
			>
				{entry && <ModelIcon model={entry} className="h-3.5 w-3.5" />}
				<span className="min-w-0 max-w-[140px] truncate text-foreground">
					{entry?.name ?? (value.model || 'Select model')}
				</span>
				{effortLabel && (
					<span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
						<span aria-hidden="true">·</span>
						{effortLabel.shortLabel}
					</span>
				)}
				<ChevronDown className="h-3 w-3 opacity-50" />
			</Button>
		);
	},
);
