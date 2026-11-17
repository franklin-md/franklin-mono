import { useId } from 'react';

import { useSettings } from '@franklin/react';
import { Label, Switch } from '@franklin/ui';

import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';

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
				<Switch
					id={inputId}
					checked={checked}
					onCheckedChange={(shareViewedReferencesByDefault) => {
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
