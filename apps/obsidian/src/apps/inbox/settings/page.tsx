import { SettingGroup } from '../../../shared/ui/setting/group.js';
import type { InboxController } from '../controller/index.js';
import { InboxShortcutSetting } from './shortcut.js';
import { InboxInstructionsSetting } from './instructions.js';
import { InboxReasoningSetting } from './reasoning.js';

type Props = { inbox: InboxController; onConfigureInboxShortcut?: () => void };
export function InboxSettings({ inbox, onConfigureInboxShortcut }: Props) {
	return (
		<SettingGroup title="Study inbox">
			<InboxReasoningSetting inbox={inbox} />
			<InboxInstructionsSetting inbox={inbox} />
			{onConfigureInboxShortcut && (
				<InboxShortcutSetting onConfigure={onConfigureInboxShortcut} />
			)}
		</SettingGroup>
	);
}
