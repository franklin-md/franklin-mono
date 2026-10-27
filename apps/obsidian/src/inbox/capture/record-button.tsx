import type { CaptureSnapshot } from './types.js';
import './styles.css';

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
	return (
		<button
			type="button"
			className={`study-record-button${recording ? ' study-record-button-recording' : ''}`}
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
			{recording ? 'Stop' : 'Record'}
		</button>
	);
}
