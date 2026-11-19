import { useId } from 'react';
import { cn } from '../../lib/cn.js';
import type { ColorSwatchesProps } from './types.js';

// Native radios provide arrow-key navigation, like ModelPickerEffort.
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
			<div
				role="radiogroup"
				aria-labelledby={id}
				className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
			>
				{options.map((option) => (
					<label
						key={option.id}
						title={option.label}
						className={cn(
							'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring',
							option.id === value
								? 'bg-muted ring-1 ring-inset ring-border'
								: 'hover:bg-accent',
							option.colorClassName,
						)}
					>
						<input
							type="radio"
							name={id}
							value={option.id}
							checked={option.id === value}
							aria-label={option.label}
							className="sr-only"
							onChange={() => onChange(option.id)}
						/>
						<span
							aria-hidden="true"
							className="size-3.5 rounded-full bg-current"
						/>
					</label>
				))}
			</div>
		</div>
	);
}
