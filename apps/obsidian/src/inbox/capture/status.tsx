import type { CaptureController } from './controller.js';
import type { CaptureSnapshot } from './types.js';
import './styles.css';

type Props = {
	controller: CaptureController;
	snapshot: CaptureSnapshot;
	onError: (error: unknown) => void;
};

export function CaptureStatus({ controller, snapshot, onError }: Props) {
	const { pending, busy, storageError } = snapshot;
	if (!pending && !storageError) return null;
	const recording = pending?.phase === 'recording';
	return (
		<section className="study-capture-panel" aria-label="Flashcard capture">
			<strong>
				{recording
					? 'Recording Mochi cards'
					: busy
						? 'Completing recording…'
						: 'Recording not completed'}
			</strong>
			{pending && <p>{pending.question.text}</p>}
			{storageError && (
				<p className="study-capture-error" role="alert">
					{storageError}
				</p>
			)}
			<button
				type="button"
				className={
					recording && !storageError
						? 'study-record-button study-record-button-recording'
						: 'study-text-button'
				}
				disabled={busy}
				onClick={() => {
					void (storageError ? controller.retry() : controller.stop()).catch(
						onError,
					);
				}}
			>
				{storageError
					? 'Retry recording'
					: recording
						? 'Stop recording'
						: 'Finish recording'}
			</button>
		</section>
	);
}
