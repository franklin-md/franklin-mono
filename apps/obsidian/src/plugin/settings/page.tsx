import { SettingGroup } from '../../shared/ui/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';
import { ViewingContextSettings } from '../../apps/chat/settings/viewing-context.js';

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
