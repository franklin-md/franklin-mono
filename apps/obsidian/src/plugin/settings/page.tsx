import type { MCPConnections } from '@franklin/extension-mcp';
import { ConnectionSettings } from './connections/settings.js';
import { SettingGroup } from '../../shared/ui/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';
import type { InboxController } from '../../apps/inbox/controller/controller.js';
import { InboxSettings } from '../../apps/inbox/settings/page.js';
import { ChatSettings } from '../../apps/chat/settings/page.js';
import { DocumentDownloadSettings } from './document-downloads.js';

type Props = {
	onConfigureInboxShortcut?: () => void;
	inbox?: InboxController;
	connections?: MCPConnections;
};

export function SettingsPage({
	onConfigureInboxShortcut,
	inbox,
	connections,
}: Props) {
	return (
		<>
			<InboxSettings
				inbox={inbox}
				onConfigureInboxShortcut={onConfigureInboxShortcut}
			/>
			{connections && (
				<SettingGroup title="Connections">
					<ConnectionSettings connections={connections} />
				</SettingGroup>
			)}
			<SettingGroup title="Credentials">
				<CredentialsSettings />
			</SettingGroup>
			<ChatSettings />
			<SettingGroup title="Document downloads">
				<DocumentDownloadSettings />
			</SettingGroup>
		</>
	);
}
