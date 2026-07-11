import type { ThinkingLevel } from '@franklin/mini-acp';
import { useThinkingLevel } from '@franklin/react';

import { cn } from '../../lib/cn.js';

// ---------------------------------------------------------------------------
// Level metadata — drives label, color, and bar count
// ---------------------------------------------------------------------------

type LevelMeta = {
	label: string;
	color: string;
	barCount: number;
};

const LEVEL_META: Partial<Record<ThinkingLevel, LevelMeta>> = {
	off: {
		label: 'Off',
		color: 'text-muted-foreground',
		barCount: 0,
	},
	minimal: {
		label: 'Min',
		color: 'text-muted-foreground',
		barCount: 1,
	},
	low: {
		label: 'Low',
		color: 'text-muted-foreground',
		barCount: 1,
	},
	medium: {
		label: 'Med',
		color: 'text-foreground/70',
		barCount: 2,
	},
	high: {
		label: 'High',
		color: 'text-foreground',
		barCount: 3,
	},
	xhigh: {
		label: 'XHigh',
		color: 'text-primary',
		barCount: 4,
	},
};

const DEFAULT_META: LevelMeta = {
	label: '?',
	color: 'text-muted-foreground',
	barCount: 0,
};

const BAR_HEIGHT_CLASSES = ['h-1', 'h-2', 'h-3', 'h-4'] as const;

// ---------------------------------------------------------------------------
// ThinkingToggle
// ---------------------------------------------------------------------------

export function ThinkingToggle() {
	const { level, cycleLevel } = useThinkingLevel();
	const meta = LEVEL_META[level] ?? DEFAULT_META;

	return (
		// Keep `w-[72px]` fixed: labels vary by level, but the control must not resize.
		<button
			type="button"
			data-testid="thinking-toggle"
			className={cn(
				'inline-flex h-6 w-[72px] items-center justify-start gap-1 rounded-md bg-transparent px-1.5 text-xs font-medium ring-1 ring-inset ring-transparent transition-colors hover:bg-accent hover:text-accent-foreground hover:ring-ring/10',
				meta.color,
			)}
			onClick={() => void cycleLevel()}
			aria-label={`Thinking level: ${meta.label}`}
			title={`Thinking: ${level}`}
		>
			<span
				className="flex h-4 w-[18px] shrink-0 items-end gap-0.5"
				aria-hidden="true"
			>
				{BAR_HEIGHT_CLASSES.map((heightClass, i) => (
					<span
						key={i}
						data-testid="thinking-toggle-bar"
						className={cn(
							'w-[3px] rounded-sm bg-current transition-opacity',
							heightClass,
							i < meta.barCount ? 'opacity-100' : 'opacity-25',
						)}
					/>
				))}
			</span>
			<span className="flex-1 whitespace-nowrap text-center">{meta.label}</span>
		</button>
	);
}
