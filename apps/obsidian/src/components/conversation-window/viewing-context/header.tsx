import { Eye, EyeOff } from 'lucide-react';

import {
	viewingContextExtension,
	type ViewingContextState,
} from '@franklin/agent';
import { useAgentState } from '@franklin/react';
import { Button, cn } from '@franklin/ui';

export function ViewingContextHeader() {
	const viewingContext = useAgentState(
		viewingContextExtension.keys.viewingContext,
	);
	const state = viewingContext.get();
	const toggleLabel = state.enabled
		? 'Hide open notes from agent'
		: 'Share open notes with agent';
	const ToggleIcon = state.enabled ? Eye : EyeOff;

	return (
		<div className="flex min-w-0 items-center text-xs text-muted-foreground">
			<Button
				type="button"
				variant="ghost"
				className={cn(
					'h-8 min-w-0 max-w-full gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-none ring-1 ring-inset transition-colors',
					state.enabled
						? 'bg-primary/10 text-primary ring-primary/35 hover:bg-primary/15 hover:text-primary'
						: 'bg-background/50 text-muted-foreground ring-input/60 hover:bg-accent hover:text-accent-foreground',
				)}
				aria-label={toggleLabel}
				title={toggleLabel}
				onClick={() => {
					viewingContext.set((draft) => {
						draft.enabled = !draft.enabled;
					});
				}}
			>
				<ToggleIcon className="h-3.5 w-3.5 shrink-0" />
				<ViewingContextStatus state={state} />
			</Button>
		</div>
	);
}

function ViewingContextStatus({ state }: { state: ViewingContextState }) {
	if (!state.enabled) {
		return <span className="truncate">Open notes hidden</span>;
	}

	const count = state.references.length;
	if (count === 0) {
		return <span className="truncate">Agent sees no files</span>;
	}

	return (
		<span className="truncate">
			Agent sees <span className="font-semibold text-primary">{count}</span>{' '}
			{count === 1 ? 'file' : 'files'}
		</span>
	);
}
