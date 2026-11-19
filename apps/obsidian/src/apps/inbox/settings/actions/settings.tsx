import { useState, useSyncExternalStore } from 'react';
import { Button } from '@franklin/ui';
import type { InboxController } from '../../controller/index.js';
import type { InboxAction } from '../../actions/types.js';
import { SettingError } from '../../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../../shared/ui/setting/item.js';
import { ActionEditor } from './editor.js';

type Props = { inbox: InboxController };

export function InboxActionSettings({ inbox }: Props) {
	const snapshot = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get(),
	);
	const [adding, setAdding] = useState<InboxAction>();
	return (
		<SettingGroup
			title="Actions"
			description="Actions run a saved prompt with a question, its answer and source context. They can edit files and run commands. Choose the model in the inbox before starting an action."
		>
			{snapshot.actions
				.filter((action) => action.id !== adding?.id)
				.map((action) => (
					<SettingItem key={action.id} layout="stacked">
						<ActionEditor action={action} controller={inbox.actions} />
					</SettingItem>
				))}
			<SettingItem layout="stacked">
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
						className="self-start"
						onClick={() =>
							setAdding({ id: crypto.randomUUID(), name: '', prompt: '' })
						}
					>
						Add action
					</Button>
				)}
			</SettingItem>
			{snapshot.storageError && (
				<SettingItem layout="stacked">
					<SettingError>{snapshot.storageError}</SettingError>
					<Button
						variant="outline"
						size="sm"
						className="self-start"
						onClick={() => {
							void inbox.retrySave().catch(() => {});
						}}
					>
						Retry save
					</Button>
				</SettingItem>
			)}
		</SettingGroup>
	);
}
