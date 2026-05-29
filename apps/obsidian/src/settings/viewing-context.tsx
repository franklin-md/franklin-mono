import { useId } from 'react';

import { useSettings } from '@franklin/react';
import { Checkbox, Label } from '@franklin/ui';

import { SettingControl } from '../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

export function ViewingContextSettings() {
	const inputId = useId();
	const settings = useSettings();
	const checked = settings.get().shareViewedReferencesByDefault;

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<Label htmlFor={inputId}>Share open notes with agent</Label>
				</SettingName>
				<SettingDescription>
					New agents can see which Obsidian notes are open.
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<Checkbox
					id={inputId}
					checked={checked}
					onCheckedChange={(nextChecked) => {
						const shareViewedReferencesByDefault = nextChecked === true;
						settings.set((draft) => {
							draft.shareViewedReferencesByDefault =
								shareViewedReferencesByDefault;
						});
					}}
				/>
			</SettingControl>
		</SettingItem>
	);
}
