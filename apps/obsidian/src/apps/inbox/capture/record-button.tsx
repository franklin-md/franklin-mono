import { Circle, Square } from 'lucide-react';
import { Button, cn } from '@franklin/ui';
import type { CaptureSnapshot } from './types.js';

type Props = {
	snapshot: CaptureSnapshot;
	questionId: string;
	onRecord: () => void;
	onStop: () => void;
};

export function RecordButton({
	snapshot,
	questionId,
	onRecord,
	onStop,
}: Props) {
	const pending = snapshot.pending;
	const recording =
		pending?.question.id === questionId && pending.phase === 'recording';
	const Icon = recording ? Square : Circle;
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="gap-2 text-[var(--text-error)]"
			aria-pressed={recording}
			disabled={snapshot.busy || !!snapshot.storageError}
			title={
				recording
					? 'Finish recording and save your new Mochi cards'
					: pending
						? 'Finish the current recording and record this answer'
						: 'Record the Mochi cards you create for this answer'
			}
			onClick={recording ? onStop : onRecord}
		>
			<Icon
				aria-hidden="true"
				className={cn(
					'size-2 fill-current',
					recording && 'animate-pulse motion-reduce:animate-none',
				)}
			/>
			{recording ? 'Stop' : 'Record'}
		</Button>
	);
}
