import { useId } from 'react';
import { cn } from '../../lib/cn.js';
import { RadioGroup, RadioGroupItem } from '../../primitives/radio-group.js';
import type { ColorSwatchesProps } from './types.js';

export function ColorSwatches({
	options,
	value,
	onChange,
	label = 'Color',
}: ColorSwatchesProps) {
	const id = useId();
	return (
		<div className="flex min-w-0 items-center gap-3 px-2 py-1">
			<span id={id} className="shrink-0 text-xs text-muted-foreground">
				{label}
			</span>
			<RadioGroup
				aria-labelledby={id}
				value={value}
				onValueChange={onChange}
				className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
			>
				{options.map((option) => (
					<RadioGroupItem
						key={option.id}
						value={option.id}
						aria-label={option.label}
						title={option.label}
						// Tailwind emits data-* variants after focus-visible, so a plain
						// checked ring color would hide the item's focus ring.
						className={cn(
							'size-6 data-[state=checked]:ring-1 data-[state=checked]:ring-inset data-[state=checked]:not-focus-visible:ring-border',
							option.colorClassName,
						)}
					>
						<span
							aria-hidden="true"
							className="size-3.5 rounded-full bg-current"
						/>
					</RadioGroupItem>
				))}
			</RadioGroup>
		</div>
	);
}
