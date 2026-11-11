import { Button } from '@franklin/ui';
import type { ThoughtDump } from '../modes/types.js';

type Props = {
	dumps: ThoughtDump[];
	onRetry: (id: string) => void;
	onDismiss: (id: string) => void;
};

export function ThoughtDumpStatus({ dumps, onRetry, onDismiss }: Props) {
	return (
		<>
			{dumps.map((dump) => (
				<div
					key={dump.id}
					className="mx-4 mb-3 shrink-0 rounded-lg bg-muted p-3 text-xs @min-[380px]:mx-6"
				>
					<p
						className="m-0"
						role={dump.state.kind === 'failed' ? 'alert' : 'status'}
					>
						{statusText(dump)}
					</p>
					<details className="mt-2">
						<summary className="cursor-pointer">Original thought dump</summary>
						<p className="mb-0 whitespace-pre-wrap wrap-anywhere">
							{dump.text}
						</p>
					</details>
					{dump.state.kind === 'failed' && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onRetry(dump.id)}
						>
							Retry extraction
						</Button>
					)}
					{(dump.state.kind === 'failed' ||
						dump.state.kind === 'succeeded') && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onDismiss(dump.id)}
						>
							Dismiss
						</Button>
					)}
				</div>
			))}
		</>
	);
}

function statusText({ state }: ThoughtDump): string {
	switch (state.kind) {
		case 'queued':
			return 'Question extraction queued…';
		case 'running':
			return 'Extracting questions…';
		case 'failed':
			return state.error;
		case 'succeeded':
			return `Added ${state.count} ${state.count === 1 ? 'question' : 'questions'}`;
	}
}
