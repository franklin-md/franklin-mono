import type { Store } from '../../systems/store/api/types.js';
import type { StatusControl, StatusState } from './types.js';

export function createStatusControl(
	statusStore: Store<StatusState>,
): StatusControl {
	function setStatus(status: StatusState): void {
		statusStore.set(() => status);
	}

	return {
		setStatus,
		setIdle: () => {
			setStatus('idle');
		},
		setUnread: () => {
			setStatus('unread');
		},
		setInProgress: () => {
			setStatus('in-progress');
		},
		markRead: () => {
			if (statusStore.get() !== 'unread') return;
			setStatus('idle');
		},
		status: () => statusStore.get(),
	};
}
