import { useSyncExternalStore } from 'react';
import { Button } from '@franklin/ui';
import type { InboxController } from '../controller/index.js';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';

type Props = { inbox: InboxController };

// Every Inbox setting saves the whole document, so one row reports a failed
// write and retries it with the settings already applied in memory.
export function InboxStorageSetting({ inbox }: Props) {
	const storageError = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get().storageError,
	);
	if (!storageError) return null;
	return (
		<SettingItem layout="stacked">
			<SettingError>{storageError}</SettingError>
			<Button
				variant="outline"
				size="sm"
				className="self-start"
				onClick={() => {
					void inbox.retrySave().catch(() => {});
				}}
			>
				Retry save
			</Button>
		</SettingItem>
	);
}
