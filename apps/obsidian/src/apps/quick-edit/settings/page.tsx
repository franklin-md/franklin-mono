import { useSyncExternalStore } from 'react';
import { PresetList } from '../../../shared/preset/settings/list.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { InstructionsSetting } from '../../../shared/ui/setting/instructions.js';
import { ModelSetting } from '../../../shared/ui/setting/model.js';
import type { QuickEditPreferences } from './store.js';
import { QuickEditShortcutSetting } from './shortcut.js';

type Props = {
	preferences: QuickEditPreferences;
	onConfigureShortcut?: () => void;
	active?: boolean;
};

// Each row saves its own change and shows its own failure.
export function QuickEditSettingsPanel({
	preferences,
	onConfigureShortcut,
	active = true,
}: Props) {
	const settings = useSyncExternalStore(preferences.subscribe, preferences.get);
	return (
		<>
			<SettingGroup
				title="Quick edit"
				description="Request edits directly inside a note. Changes use the file's existing review controls."
			>
				<ModelSetting
					label="Quick edit model"
					description="Used for new quick edits."
					value={settings}
					active={active}
					onChange={preferences.configure}
				/>
				<InstructionsSetting
					label="Editing instructions"
					description="Describe your outline and writing conventions. You can name instruction files for the agent to read."
					value={settings.instructions}
					onSave={(instructions) => preferences.configure({ instructions })}
				/>
			</SettingGroup>
			<SettingGroup
				title="Presets"
				description="Run a saved prompt from Franklin: Quick edit presets. Selected text or the current row supplies context."
			>
				<PresetList
					noun="preset"
					presets={settings.presets}
					onUpdate={(change) =>
						preferences.configure((current) => ({
							presets: change(current.presets),
						}))
					}
				/>
			</SettingGroup>
			{onConfigureShortcut && (
				<SettingGroup title="Shortcut">
					<QuickEditShortcutSetting onConfigure={onConfigureShortcut} />
				</SettingGroup>
			)}
		</>
	);
}
