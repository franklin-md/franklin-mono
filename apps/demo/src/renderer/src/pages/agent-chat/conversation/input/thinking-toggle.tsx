import type { ThinkingLevel } from '@franklin/mini-acp';
import { useThinkingLevel } from '@franklin/react';

import { cn } from '@/lib/utils.js';

// ---------------------------------------------------------------------------
// Level metadata — drives label, color, and dot count
// ---------------------------------------------------------------------------

type LevelMeta = {
	label: string;
	color: string;
	dotColor: string;
	dots: number;
};

const LEVEL_META: Partial<Record<ThinkingLevel, LevelMeta>> = {
	off: {
		label: 'Off',
		color: 'text-muted-foreground/40',
		dotColor: 'bg-muted-foreground/40',
		dots: 0,
	},
	low: {
		label: 'L',
		color: 'text-muted-foreground',
		dotColor: 'bg-muted-foreground',
		dots: 1,
	},
	medium: {
		label: 'M',
		color: 'text-foreground/70',
		dotColor: 'bg-foreground/70',
		dots: 2,
	},
	high: {
		label: 'H',
		color: 'text-foreground',
		dotColor: 'bg-foreground',
		dots: 3,
	},
	xhigh: {
		label: 'XH',
		color: 'text-primary',
		dotColor: 'bg-primary',
		dots: 4,
	},
};

const DEFAULT_META: LevelMeta = {
	label: '?',
	color: 'text-muted-foreground',
	dotColor: 'bg-muted-foreground',
	dots: 0,
};

const DOT_COUNT = 4;

// ---------------------------------------------------------------------------
// ThinkingToggle
// ---------------------------------------------------------------------------

export function ThinkingToggle() {
	const { level, cycleLevel } = useThinkingLevel();
	const meta = LEVEL_META[level] ?? DEFAULT_META;

	return (
		<button
			type="button"
			data-testid="thinking-toggle"
			className={cn(
				'inline-flex h-8 w-14 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
				meta.color,
			)}
			onClick={() => void cycleLevel()}
			title={`Thinking: ${level}`}
		>
			<span className="leading-none">{meta.label}</span>
			<span className="flex gap-0.5">
				{Array.from({ length: DOT_COUNT }, (_, i) => (
					<span
						key={i}
						className={cn(
							'h-1 w-1 rounded-full',
							i < meta.dots ? meta.dotColor : 'bg-muted-foreground/20',
						)}
					/>
				))}
			</span>
		</button>
	);
}
