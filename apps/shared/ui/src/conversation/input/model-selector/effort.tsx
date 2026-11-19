import { useId } from 'react';
import { cn } from '../../../lib/cn.js';
import { EFFORT_LABELS } from './effort-labels.js';
import type { ModelPickerEffortProps } from './types.js';

export function ModelPickerEffort({
	level,
	levels,
	onChange,
}: ModelPickerEffortProps) {
	const id = useId();

	// Width check (2026-11-19, Storybook, 16px root, default w-80 popover): the
	// choices have 253px. The six THINKING_LEVELS need 235px and fit on one row;
	// the retired Minimal level made seven (270px) and forced a wrap. Choices
	// still wrap rather than scroll, so narrower panes keep every level visible
	// without measuring layout.
	return (
		<div className="flex min-w-0 items-start gap-3 px-2 py-1">
			<span id={id} className="shrink-0 py-1 text-xs text-muted-foreground">
				Effort
			</span>
			<div
				role="radiogroup"
				aria-labelledby={id}
				className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
			>
				{levels.map((choice) => (
					<label
						key={choice}
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
