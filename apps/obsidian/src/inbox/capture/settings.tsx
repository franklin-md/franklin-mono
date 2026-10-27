import { useId, useState, useSyncExternalStore } from 'react';
import { Button, Input, Label } from '@franklin/ui';
import type { CaptureController } from './controller.js';
import { errorMessage } from '../controller/error.js';

type Props = { controller: CaptureController };

export function CaptureSettings({ controller }: Props) {
	const snapshot = useSyncExternalStore(
		(notify) => controller.state.subscribe(notify),
		() => controller.state.get(),
	);
	const [folder, setFolder] = useState(snapshot.settings.collectionFolder);
	const [database, setDatabase] = useState(snapshot.settings.databasePath);
	const [error, setError] = useState<string>();
	const id = useId();
	return (
		<form
			className="grid gap-2"
			onSubmit={(event) => {
				event.preventDefault();
				setError(undefined);
				void controller
					.configure({
						collectionFolder: folder.trim(),
						databasePath: database.trim(),
					})
					.catch((error: unknown) => setError(errorMessage(error)));
			}}
		>
			<p>
				Record an answered question and save cards in Mochi. Stop or record
				another answer to save the example automatically. Empty recordings are
				discarded.
			</p>
			<Label htmlFor={`${id}-folder`}>Collection folder</Label>
			<Input
				id={`${id}-folder`}
				value={folder}
				disabled={snapshot.busy}
				onChange={(event) => setFolder(event.target.value)}
			/>
			<p>
				Relative to this vault. Each nonempty recording gets its own JSON file.
				Setting changes apply to future recordings.
			</p>
			<Label htmlFor={`${id}-database`}>Mochi database path</Label>
			<Input
				id={`${id}-database`}
				value={database}
				disabled={snapshot.busy}
				onChange={(event) => setDatabase(event.target.value)}
			/>
			<Button type="submit" size="sm" disabled={snapshot.busy}>
				Save capture settings
			</Button>
			{error && <p role="alert">{error}</p>}
		</form>
	);
}
