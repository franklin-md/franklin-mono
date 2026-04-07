import type { IntelligenceTier } from './catalog.js';

export const INTELLIGENCE_LABELS: Record<
	IntelligenceTier,
	{ label: string; color: string }
> = {
	frontier: {
		label: 'Frontier',
		color: 'text-violet-600 dark:text-violet-400',
	},
	strong: { label: 'Strong', color: 'text-blue-600 dark:text-blue-400' },
	balanced: {
		label: 'Balanced',
		color: 'text-emerald-600 dark:text-emerald-400',
	},
	efficient: {
		label: 'Efficient',
		color: 'text-amber-600 dark:text-amber-400',
	},
};
