// Persist palette keys; complete class strings keep Tailwind's static scan reliable.
export const presetColors = {
	blue: {
		label: 'Blue',
		colorClassName:
			'text-[var(--color-blue)] hover:text-[var(--color-blue)] focus-visible:ring-[var(--color-blue)]/70',
		selectedClassName:
			'bg-[var(--color-blue)]/15 ring-[var(--color-blue)]/50 hover:bg-[var(--color-blue)]/20',
	},
	amber: {
		label: 'Amber',
		colorClassName:
			'text-[var(--color-yellow)] hover:text-[var(--color-yellow)] focus-visible:ring-[var(--color-yellow)]/70',
		selectedClassName:
			'bg-[var(--color-yellow)]/15 ring-[var(--color-yellow)]/50 hover:bg-[var(--color-yellow)]/20',
	},
	green: {
		label: 'Green',
		colorClassName:
			'text-[var(--color-green)] hover:text-[var(--color-green)] focus-visible:ring-[var(--color-green)]/70',
		selectedClassName:
			'bg-[var(--color-green)]/15 ring-[var(--color-green)]/50 hover:bg-[var(--color-green)]/20',
	},
	purple: {
		label: 'Purple',
		colorClassName:
			'text-[var(--color-purple)] hover:text-[var(--color-purple)] focus-visible:ring-[var(--color-purple)]/70',
		selectedClassName:
			'bg-[var(--color-purple)]/15 ring-[var(--color-purple)]/50 hover:bg-[var(--color-purple)]/20',
	},
	red: {
		label: 'Red',
		colorClassName:
			'text-[var(--color-red)] hover:text-[var(--color-red)] focus-visible:ring-[var(--color-red)]/70',
		selectedClassName:
			'bg-[var(--color-red)]/15 ring-[var(--color-red)]/50 hover:bg-[var(--color-red)]/20',
	},
} as const;
