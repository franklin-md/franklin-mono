import { Button, cn } from '@franklin/ui';
import type { InboxPreferences } from '../controller/types.js';
import { inboxModes } from '../modes/presentation.js';

type Props = {
	mode: InboxPreferences['mode'];
	onChange: (mode: NonNullable<InboxPreferences['mode']>) => void;
};

export function ModeControl({ mode, onChange }: Props) {
	const splitting = mode === 'thought-dump';
	const presentation = inboxModes[mode ?? 'question'];
	const Icon = presentation.icon;
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-label="Thought dump mode"
			aria-pressed={splitting}
			title={presentation.description}
			className={cn(
				'h-auto gap-1.5 px-2.5 py-1 text-xs ring-1 ring-inset',
				presentation.colorClassName,
				presentation.selectedClassName,
			)}
			onClick={() => onChange(splitting ? 'question' : 'thought-dump')}
		>
			<Icon size={13} aria-hidden="true" />
			{presentation.label}
		</Button>
	);
}
