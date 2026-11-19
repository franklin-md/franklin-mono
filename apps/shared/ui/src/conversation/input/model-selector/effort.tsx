import { useId } from 'react';
import { RadioGroup, RadioGroupItem } from '../../../primitives/radio-group.js';
import { EFFORT_LABELS } from './effort-labels.js';
import type { EffortChoiceProps } from './types.js';

export function EffortChoice({ value, levels, onChange }: EffortChoiceProps) {
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
			<RadioGroup
				aria-labelledby={id}
				value={value}
				// Radix reports a string; map it back to one of the offered levels.
				onValueChange={(next) => {
					const level = levels.find((choice) => choice === next);
					if (level) onChange(level);
				}}
				className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
			>
				{levels.map((level) => (
					<RadioGroupItem
						key={level}
						value={level}
						aria-label={EFFORT_LABELS[level].label}
						title={EFFORT_LABELS[level].label}
						className="px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors data-[state=checked]:text-foreground data-[state=unchecked]:hover:text-accent-foreground"
					>
						{EFFORT_LABELS[level].shortLabel}
					</RadioGroupItem>
				))}
			</RadioGroup>
		</div>
	);
}
