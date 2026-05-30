import { SettingGroup } from '../components/obsidian-native/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';
import { ViewingContextSettings } from './viewing-context.js';

export function SettingsPage() {
	return (
		<>
			<SettingGroup title="Credentials">
				<CredentialsSettings />
			</SettingGroup>
			<SettingGroup title="Agent settings">
				<ViewingContextSettings />
			</SettingGroup>
		</>
	);
}
