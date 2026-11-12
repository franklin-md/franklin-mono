import { LoaderCircle, Square } from 'lucide-react';
import { Button } from '@franklin/ui';
import type { QuickEditState } from '../types.js';
import { DirectivePill } from '../../../shared/directives/render/pill.js';

type Props = {
	state: QuickEditState;
	composing?: boolean;
	stop: () => void;
};

export function QuickEditPill({ state, composing = false, stop }: Props) {
	if (composing || state.status === 'ready' || state.status === 'done')
		return null;
	const running = state.status === 'running';
	const label = {
		running: 'Editing',
		stopped: 'Stopped',
		failed: 'Edit failed',
	}[state.status];
	return (
		<DirectivePill
			className="franklin-quick-edit-marker bg-primary/20 text-foreground ring-1 ring-inset ring-primary/60"
			title={state.error || state.prompt || 'Request an edit'}
		>
			{running ? (
				<>
					<LoaderCircle className="animate-spin" aria-hidden="true" />
					<span role="status">{label}</span>
					<Button
						type="button"
						variant="ghost"
						className="size-[1em] min-h-0 shrink-0 p-0 text-[length:inherit] leading-none"
						aria-label="Stop quick edit"
						onClick={stop}
					>
						<Square aria-hidden="true" />
					</Button>
				</>
			) : (
				<span role="status">{label}</span>
			)}
		</DirectivePill>
	);
}
