import { useState, useSyncExternalStore } from 'react';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { quickEditError } from '../error.js';
import type { QuickEditPreferences } from './store.js';
import type { QuickEditSettings } from '../types.js';
import { QuickEditInstructionsSetting } from './instructions.js';
import { QuickEditModelSetting } from './model.js';
import { PresetSettings } from './presets/list.js';
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
			<PresetSettings preferences={preferences} />
			{onConfigureShortcut && (
				<SettingGroup title="Shortcut">
					<QuickEditShortcutSetting onConfigure={onConfigureShortcut} />
				</SettingGroup>
			)}
		</>
	);
}
