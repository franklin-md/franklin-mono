import { useState, useSyncExternalStore } from 'react';
import { PresetList } from '../../../shared/preset/settings/list.js';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { quickEditError } from '../error.js';
import type { QuickEditPreferences } from './store.js';
import type { QuickEditSettings } from '../types.js';
import { QuickEditInstructionsSetting } from './instructions.js';
import { QuickEditModelSetting } from './model.js';
import { QuickEditShortcutSetting } from './shortcut.js';

type Props = {
	preferences: QuickEditPreferences;
	onConfigureShortcut?: () => void;
	active?: boolean;
};

export function QuickEditSettingsPanel({
	preferences,
	onConfigureShortcut,
	active = true,
}: Props) {
	const settings = useSyncExternalStore(
		(notify) => preferences.state.subscribe(notify),
		() => preferences.state.get(),
	);
	const [error, setError] = useState('');
	const [pending, setPending] = useState(false);
	async function save(update: Partial<QuickEditSettings>) {
		setPending(true);
		setError('');
		try {
			await preferences.configure(update);
		} catch (error) {
			setError(quickEditError(error));
		} finally {
			setPending(false);
		}
	}
	return (
		<>
			<SettingGroup
				title="Quick edit"
				description="Request edits directly inside a note. Changes use the file's existing review controls."
			>
				<QuickEditModelSetting
					settings={settings}
					pending={pending}
					active={active}
					onSave={save}
				/>
				<QuickEditInstructionsSetting
					initial={settings.instructions}
					pending={pending}
					onSave={save}
				/>
				{error && (
					<SettingItem>
						<SettingError>{error}</SettingError>
					</SettingItem>
				)}
			</SettingGroup>
			<SettingGroup
				title="Presets"
				description="Run a saved prompt from Franklin: Quick edit presets. Selected text or the current row supplies context."
			>
				<PresetList
					noun="preset"
					presets={settings.presets}
					onUpdate={(change) =>
						preferences.configure({
							presets: change(preferences.state.get().presets),
						})
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
