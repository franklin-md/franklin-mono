import { useSyncExternalStore } from 'react';
import type { InboxController } from '../../controller/index.js';
import { PresetList } from '../../../../shared/preset/settings/list.js';
import { SettingGroup } from '../../../../shared/ui/setting/group.js';

type Props = { inbox: InboxController };

export function InboxActionSettings({ inbox }: Props) {
	const actions = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get().actions,
	);
	return (
		<SettingGroup
			title="Actions"
			description="Actions run a saved prompt with a question, its answer and source context. They can edit files and run commands, using the Inbox model and reasoning."
		>
			<PresetList
				noun="action"
				presets={actions}
				onUpdate={(change) => inbox.actions.update(change)}
			/>
		</SettingGroup>
	);
}
