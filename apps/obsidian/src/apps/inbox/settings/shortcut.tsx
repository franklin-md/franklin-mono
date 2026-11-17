import { Button } from '@franklin/ui';
import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';

type Props = { onConfigure: () => void };

export function InboxShortcutSetting({ onConfigure }: Props) {
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>Add selection to study inbox</SettingName>
				<SettingDescription>
					Select text in a Markdown note and send it to the inbox with a
					shortcut. Configure the keys in Obsidian’s hotkey editor.
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<Button variant="outline" size="sm" onClick={onConfigure}>
					Configure shortcut
				</Button>
			</SettingControl>
		</SettingItem>
	);
}
