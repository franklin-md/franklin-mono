import { Check, LoaderCircle, Pencil, Square } from 'lucide-react';
import { Button } from '@franklin/ui';
import type { QuickEditState } from '../types.js';

type Props = {
	state: QuickEditState;
	edit: () => void;
	dismiss: () => void;
	stop: () => void;
};

export function QuickEditPill({ state, edit, dismiss, stop }: Props) {
	const running = state.status === 'running';
	const label =
		state.status === 'done'
			? 'Edit complete'
			: state.status === 'ready'
				? 'Edit'
				: state.status === 'running'
					? 'Editing'
					: state.status === 'stopped'
						? 'Stopped'
						: 'Edit failed';
	return (
		<span
			className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1 align-baseline text-xs text-muted-foreground ring-1 ring-inset ring-border"
			title={state.error || state.prompt || 'Request an edit'}
		>
			{running ? (
				<>
					<LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
					<span role="status">{label}</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 w-6 rounded-full p-0"
						aria-label="Stop quick edit"
						onClick={stop}
					>
						<Square size={12} aria-hidden="true" />
					</Button>
				</>
			) : (
				<>
					{state.status !== 'done' && <span className="px-1">{label}</span>}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 w-6 rounded-full p-0"
						aria-label="Dismiss quick edit"
						title="Dismiss request; changes remain in file review"
						onClick={dismiss}
					>
						<Check size={12} aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 w-6 rounded-full p-0"
						aria-label="Amend quick edit"
						onClick={edit}
					>
						<Pencil size={12} aria-hidden="true" />
					</Button>
				</>
			)}
		</span>
	);
}
