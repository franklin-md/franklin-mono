import { useSyncExternalStore } from 'react';
import { PresetList } from '../../../shared/preset/settings/list.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { InstructionsSetting } from '../../../shared/ui/setting/instructions.js';
import { ModelSetting } from '../../../shared/ui/setting/model.js';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import type { InboxController } from '../controller/index.js';
import { InboxShortcutSetting } from './shortcut.js';

type Props = {
	inbox: InboxController;
	onConfigureInboxShortcut?: () => void;
	active?: boolean;
};

// Each row saves its own change and shows its own failure.
export function InboxSettings({
	inbox,
	onConfigureInboxShortcut,
	active = true,
}: Props) {
	const { settings } = inbox;
	const value = useSyncExternalStore(settings.subscribe, settings.get);
	return (
		<>
			<SettingGroup title="Answers">
				<ModelSetting
					label="Inbox model"
					description="Applies to new questions, follow-ups and actions. Retries keep their original model and reasoning."
					value={value}
					active={active}
					onChange={settings.configure}
				/>
				<InstructionsSetting
					label="Answer instructions"
					description="Write how the inbox should answer. Saved instructions apply to new questions and follow-ups. Retries keep their original instructions."
					value={value.answerInstructions}
					resetTo={DEFAULT_ANSWER_INSTRUCTIONS}
					onSave={(answerInstructions) =>
						settings.configure({ answerInstructions })
					}
				/>
			</SettingGroup>
			<SettingGroup
				title="Actions"
				description="Actions run a saved prompt with a question, its answer and source context. They can edit files and run commands, using the Inbox model and reasoning."
			>
				<PresetList
					noun="action"
					presets={value.actions}
					onUpdate={(change) =>
						settings.configure((current) => ({
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
