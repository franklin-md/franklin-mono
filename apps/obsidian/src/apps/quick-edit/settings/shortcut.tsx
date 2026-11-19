import { Button } from '@franklin/ui';
import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';

type Props = { onConfigure: () => void };

export function QuickEditShortcutSetting({ onConfigure }: Props) {
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>Quick edit</SettingName>
				<SettingDescription>
					Insert a quick edit prompt at the cursor in a Markdown note. Configure
					the keys in Obsidian’s hotkey editor.
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<Button type="button" variant="outline" size="sm" onClick={onConfigure}>
					Configure quick edit shortcut
				</Button>
			</SettingControl>
		</SettingItem>
	);
}
