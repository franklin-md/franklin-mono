import { Square } from 'lucide-react';
import { Button } from '@franklin/ui';
import type { CaptureController } from './controller.js';
import type { CaptureSnapshot } from './types.js';

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
		<section
			className="mx-4 mb-3 max-h-[45%] shrink-0 overflow-y-auto rounded-lg bg-muted p-3 text-xs wrap-anywhere ring-1 ring-inset ring-border @min-[380px]:mx-6"
			aria-label="Flashcard capture"
		>
			<strong>
				{recording
					? 'Recording Mochi cards'
					: busy
						? 'Completing recording…'
						: 'Recording not completed'}
			</strong>
			{pending && <p className="mt-1.5 mb-0">{pending.question.text}</p>}
			{storageError && (
				<p className="mt-1.5 mb-0 text-[var(--text-error)]" role="alert">
					{storageError}
				</p>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="mt-2 gap-2"
				disabled={busy}
				onClick={() => {
					void (storageError ? controller.retry() : controller.stop()).catch(
						onError,
					);
				}}
			>
				{recording && !storageError && (
					<Square
						aria-hidden="true"
						className="size-2 animate-pulse fill-current text-[var(--text-error)] motion-reduce:animate-none"
					/>
				)}
				{storageError
					? 'Retry recording'
					: recording
						? 'Stop recording'
						: 'Finish recording'}
			</Button>
		</section>
	);
}
