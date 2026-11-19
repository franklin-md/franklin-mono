import { useState, useSyncExternalStore } from 'react';
import { errorMessage } from '../../../shared/error/message.js';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { ModelSetting } from '../../../shared/ui/setting/model.js';
import type { InboxController } from '../controller/index.js';
import type { InboxPreferences } from '../controller/types.js';
import { InboxShortcutSetting } from './shortcut.js';
import { InboxInstructionsSetting } from './instructions.js';
import { InboxActionSettings } from './actions/settings.js';
import { InboxStorageSetting } from './storage.js';

type Props = {
	inbox: InboxController;
	onConfigureInboxShortcut?: () => void;
	active?: boolean;
};

export function InboxSettings({
	inbox,
	onConfigureInboxShortcut,
	active = true,
}: Props) {
	const preferences = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get().preferences,
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	// Model, reasoning and instructions are preferences, so they save through
	// configure. Actions are a separate list in the same document, updated
	// through inbox.actions.
	async function configure(update: Partial<InboxPreferences>) {
		setPending(true);
		setError('');
		try {
			await inbox.configure(update);
		} catch (error) {
			// The change stays applied in memory. A failed write is reported once,
			// by the storage row with Retry save.
			if (!inbox.state.get().storageError) setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}
	return (
		<>
			<InboxStorageSetting inbox={inbox} />
			<SettingGroup title="Answers">
				<ModelSetting
					label="Inbox model"
					description="Applies to new questions, follow-ups and actions. Retries keep their original model and reasoning."
					value={preferences}
					pending={pending}
					active={active}
					onChange={(update) => void configure(update)}
				/>
				<InboxInstructionsSetting
					initial={preferences.answerInstructions}
					pending={pending}
					onSave={configure}
				/>
				{error && (
					<SettingItem>
						<SettingError>{error}</SettingError>
					</SettingItem>
				)}
			</SettingGroup>
			<InboxActionSettings inbox={inbox} />
			{onConfigureInboxShortcut && (
				<SettingGroup title="Shortcut">
					<InboxShortcutSetting onConfigure={onConfigureInboxShortcut} />
				</SettingGroup>
			)}
		</>
	);
}
