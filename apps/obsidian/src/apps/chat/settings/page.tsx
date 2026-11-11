import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { ViewingContextSettings } from './viewing-context.js';

export function ChatSettings() {
	return (
		<SettingGroup title="Context">
			<ViewingContextSettings />
		</SettingGroup>
	);
}
