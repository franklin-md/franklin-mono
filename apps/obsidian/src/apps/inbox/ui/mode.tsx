import { MessageCircle, Split } from 'lucide-react';
import { Button, cn } from '@franklin/ui';
import type { InboxPreferences } from '../controller/types.js';

type Props = {
	mode: InboxPreferences['mode'];
	onChange: (mode: NonNullable<InboxPreferences['mode']>) => void;
};

export function ModeControl({ mode, onChange }: Props) {
	const splitting = mode === 'thought-dump';
	const Icon = splitting ? Split : MessageCircle;
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-label="Thought dump mode"
			aria-pressed={splitting}
			title={
				splitting
					? 'Extract separate questions from a thought dump'
					: 'Answer one question'
			}
			className={cn(
				'h-auto gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset',
				splitting
					? 'bg-primary/10 text-primary ring-primary/40 hover:bg-primary/15 hover:text-primary'
					: 'text-muted-foreground ring-border',
			)}
			onClick={() => onChange(splitting ? 'question' : 'thought-dump')}
		>
			<Icon size={13} aria-hidden="true" />
			{splitting ? 'Thought dump' : 'Question'}
		</Button>
	);
}
