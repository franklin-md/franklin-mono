import { useId, useLayoutEffect, useRef } from 'react';
import { cn } from '../../../lib/cn.js';
import { EFFORT_LABELS } from './effort-labels.js';
import type { ModelPickerEffortProps } from './types.js';

export function ModelPickerEffort({
	level,
	levels,
	onChange,
}: ModelPickerEffortProps) {
	const id = useId();
	const selected = useRef<HTMLLabelElement>(null);
	const choices = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const revealSelection = () => {
			selected.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		};
		// Radix can constrain the popover width after its initial layout. Observe
		// that final width (and pane resizes) so a saved selection stays visible.
		const observer = new ResizeObserver(revealSelection);
		if (choices.current) observer.observe(choices.current);
		revealSelection();
		return () => observer.disconnect();
	}, [level, levels]);

	return (
		<div className="flex min-w-0 items-center gap-3 px-2 py-1">
			<span id={id} className="shrink-0 text-xs text-muted-foreground">
				Effort
			</span>
			<div
				ref={choices}
				role="radiogroup"
				aria-labelledby={id}
				className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]"
			>
				{levels.map((choice) => (
					<label
						key={choice}
						ref={choice === level ? selected : undefined}
						className={cn(
							'relative shrink-0 cursor-pointer select-none rounded-md px-1.5 py-1 text-xs font-medium transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring',
							choice === level
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
						)}
						title={EFFORT_LABELS[choice].label}
					>
						<input
							type="radio"
							name={id}
							value={choice}
							checked={choice === level}
							aria-label={EFFORT_LABELS[choice].label}
							className="sr-only"
							onChange={() => onChange(choice)}
						/>
						{EFFORT_LABELS[choice].shortLabel}
					</label>
				))}
			</div>
		</div>
	);
}
