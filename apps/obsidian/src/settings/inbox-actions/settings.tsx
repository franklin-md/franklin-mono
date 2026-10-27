import { useState, useSyncExternalStore } from 'react';
import { Button } from '@franklin/ui';
import type { InboxController } from '../../inbox/controller/controller.js';
import type { InboxAction } from '../../inbox/actions/types.js';
import { ActionEditor } from './editor.js';
import './styles.css';

type Props = { inbox: InboxController };

export function InboxActionSettings({ inbox }: Props) {
	const snapshot = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get(),
	);
	const [adding, setAdding] = useState<InboxAction>();
	return (
		<div className="franklin-action-settings">
			<p>
				Actions run a saved prompt with a question, its answer and source
				context. They can edit files and run commands. Choose the model in the
				inbox before starting an action.
			</p>
			{snapshot.actions
				.filter((action) => action.id !== adding?.id)
				.map((action) => (
					<ActionEditor
						key={action.id}
						action={action}
						controller={inbox.actions}
					/>
				))}
			{adding ? (
				<ActionEditor
					isNew
					action={adding}
					controller={inbox.actions}
					onDone={() => setAdding(undefined)}
				/>
			) : (
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						setAdding({ id: crypto.randomUUID(), name: '', prompt: '' })
					}
				>
					Add action
				</Button>
			)}
			{snapshot.storageError && (
				<div>
					<p role="alert">{snapshot.storageError}</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							void inbox.retrySave().catch(() => {});
						}}
					>
						Retry save
					</Button>
				</div>
			)}
		</div>
	);
}
