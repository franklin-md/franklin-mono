import { SettingGroup } from '../components/obsidian-native/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';
import { InboxShortcutSetting } from './inbox-shortcut.js';
import { InboxInstructionsSetting } from './inbox-instructions.js';
import { InboxReasoningSetting } from './inbox-reasoning.js';
import { ViewingContextSettings } from './viewing-context.js';
import type { InboxController } from '../inbox/controller/controller.js';
import { InboxActionSettings } from './inbox-actions/settings.js';
import { CaptureSettings } from '../inbox/capture/settings.js';

type Props = { onConfigureInboxShortcut?: () => void; inbox?: InboxController };

export function SettingsPage({ onConfigureInboxShortcut, inbox }: Props) {
	return (
		<>
			{(onConfigureInboxShortcut || inbox) && (
				<SettingGroup title="Study inbox">
					{inbox && <InboxReasoningSetting inbox={inbox} />}
					{inbox && <InboxInstructionsSetting inbox={inbox} />}
					{onConfigureInboxShortcut && (
						<InboxShortcutSetting onConfigure={onConfigureInboxShortcut} />
					)}
				</SettingGroup>
			)}
			{inbox && (
				<SettingGroup title="Inbox actions">
					<InboxActionSettings inbox={inbox} />
				</SettingGroup>
			)}
			{inbox?.capture && (
				<SettingGroup title="Flashcard capture">
					<CaptureSettings controller={inbox.capture} />
				</SettingGroup>
			)}
			<SettingGroup title="Credentials">
				<CredentialsSettings />
			</SettingGroup>
			<SettingGroup title="Agent settings">
				<ViewingContextSettings />
			</SettingGroup>
		</>
	);
}
