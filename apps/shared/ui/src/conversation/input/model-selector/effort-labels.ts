import type { ThinkingLevel } from '@franklin/mini-acp';

type EffortLabel = { label: string; shortLabel: string };

export const EFFORT_LABELS: Record<ThinkingLevel, EffortLabel> = {
	off: { label: 'Off', shortLabel: 'Off' },
	minimal: { label: 'Minimal', shortLabel: 'Min' },
	low: { label: 'Low', shortLabel: 'Low' },
	medium: { label: 'Medium', shortLabel: 'Med' },
	high: { label: 'High', shortLabel: 'High' },
	xhigh: { label: 'Extra high', shortLabel: 'XHigh' },
};
