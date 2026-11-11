import { SettingGroup } from '../../../shared/ui/setting/group.js';
import type { InboxController } from '../controller/controller.js';
import { InboxShortcutSetting } from './shortcut.js';
import { InboxInstructionsSetting } from './instructions.js';
import { InboxReasoningSetting } from './reasoning.js';
import { InboxActionSettings } from './actions/settings.js';
import { CaptureSettings } from '../capture/settings.js';

type Props = { inbox?: InboxController; onConfigureInboxShortcut?: () => void };
export function InboxSettings({ inbox, onConfigureInboxShortcut }: Props) {
	return (
		<>
			{' '}
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
		</>
	);
}
