import { MessageCircle, Split } from 'lucide-react';

// Keep complete class names here so Tailwind discovers both palettes. Obsidian's
// named colors adapt to the host theme without adding shared UI theme tokens.
export const inboxModes = {
	question: {
		label: 'Question',
		description: 'Answer one question',
		icon: MessageCircle,
		colorClassName:
			'text-[var(--color-blue)] hover:text-[var(--color-blue)] focus-visible:ring-[var(--color-blue)]/70',
		selectedClassName:
			'bg-[var(--color-blue)]/15 ring-[var(--color-blue)]/50 hover:bg-[var(--color-blue)]/20',
	},
	'thought-dump': {
		label: 'Thought dump',
		description: 'Extract separate questions from a thought dump',
		icon: Split,
		colorClassName:
			'text-[var(--color-purple)] hover:text-[var(--color-purple)] focus-visible:ring-[var(--color-purple)]/70',
		selectedClassName:
			'bg-[var(--color-purple)]/15 ring-[var(--color-purple)]/50 hover:bg-[var(--color-purple)]/20',
	},
} as const;
