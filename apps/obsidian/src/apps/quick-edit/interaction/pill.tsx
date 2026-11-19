import { LoaderCircle, Square } from 'lucide-react';
import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@franklin/ui';
import type { QuickEditState } from '../types.js';
import { DirectivePill } from '../../../shared/directives/render/pill.js';
import { FailurePopover } from '../../../shared/ui/failure/popover.js';

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
		failed: 'Failed',
	}[state.status];
	const explanation = state.error || state.prompt || 'Request an edit';
	const pill = (
		<DirectivePill
			className="franklin-quick-edit-marker bg-primary/20 text-foreground ring-1 ring-inset ring-primary/60 focus-visible:outline-2 focus-visible:outline-ring"
			title={running ? explanation : undefined}
			tabIndex={running ? undefined : 0}
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
	if (running) return pill;
	if (state.status === 'failed')
		return (
			<FailurePopover message={state.error} stopCode={state.stopCode}>
				{pill}
			</FailurePopover>
		);
	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>{pill}</TooltipTrigger>
				<TooltipContent
					side="top"
					collisionPadding={8}
					className="max-h-[min(20rem,var(--radix-tooltip-content-available-height))] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere motion-reduce:animate-none"
				>
					{explanation}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
