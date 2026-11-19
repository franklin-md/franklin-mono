import { SettingGroup } from '../../../shared/ui/setting/group.js';
import type { InboxController } from '../controller/index.js';
import { InboxShortcutSetting } from './shortcut.js';
import { InboxInstructionsSetting } from './instructions.js';
import { InboxReasoningSetting } from './reasoning.js';
import { InboxActionSettings } from './actions/settings.js';

type Props = { inbox: InboxController; onConfigureInboxShortcut?: () => void };
export function InboxSettings({ inbox, onConfigureInboxShortcut }: Props) {
	return (
		<>
			<SettingGroup title="Answers">
				<InboxReasoningSetting inbox={inbox} />
				<InboxInstructionsSetting inbox={inbox} />
			</SettingGroup>
			<InboxActionSettings inbox={inbox} />
			{onConfigureInboxShortcut && (
				<SettingGroup title="Shortcut">
					<InboxShortcutSetting onConfigure={onConfigureInboxShortcut} />
				</SettingGroup>
			)}
		</>
	);
}
