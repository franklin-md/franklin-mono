import { useState, useSyncExternalStore } from 'react';
import { errorMessage } from '../../../shared/error/message.js';
import { PresetList } from '../../../shared/preset/settings/list.js';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { ModelSetting } from '../../../shared/ui/setting/model.js';
import type { InboxController } from '../controller/index.js';
import type { InboxSettings as Settings } from '../controller/types.js';
import { InboxShortcutSetting } from './shortcut.js';
import { InboxInstructionsSetting } from './instructions.js';

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
	const settings = useSyncExternalStore(
		inbox.settings.subscribe,
		inbox.settings.get,
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	async function configure(update: Partial<Settings>) {
		setPending(true);
		setError('');
		try {
			await inbox.settings.configure(update);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}
	return (
		<>
			<SettingGroup title="Answers">
				<ModelSetting
					label="Inbox model"
					description="Applies to new questions, follow-ups and actions. Retries keep their original model and reasoning."
					value={settings}
					pending={pending}
					active={active}
					onChange={(update) => void configure(update)}
				/>
				<InboxInstructionsSetting
					initial={settings.answerInstructions}
					pending={pending}
					onSave={configure}
				/>
				{error && (
					<SettingItem>
						<SettingError>{error}</SettingError>
					</SettingItem>
				)}
			</SettingGroup>
			<SettingGroup
				title="Actions"
				description="Actions run a saved prompt with a question, its answer and source context. They can edit files and run commands, using the Inbox model and reasoning."
			>
				<PresetList
					noun="action"
					presets={settings.actions}
					onUpdate={(change) =>
						inbox.settings.configure((current) => ({
							actions: change(current.actions),
						}))
					}
				/>
			</SettingGroup>
			{onConfigureInboxShortcut && (
				<SettingGroup title="Shortcut">
					<InboxShortcutSetting onConfigure={onConfigureInboxShortcut} />
				</SettingGroup>
			)}
		</>
	);
}
