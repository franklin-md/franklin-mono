export type StatusState = 'idle' | 'unread' | 'in-progress';

export interface StatusControl {
	setStatus: (status: StatusState) => void;
	setIdle: () => void;
	setUnread: () => void;
	setInProgress: () => void;
	markRead: () => void;
	status: () => StatusState;
}
