import type { MenuController } from './mention/menu-controller.js';

interface HandlePromptEditorKeyDownOptions {
	readonly menuController: MenuController;
	readonly event: KeyboardEvent;
	readonly sending: boolean;
	readonly send: () => void;
	readonly cancel: () => void;
}

export function handlePromptEditorKeyDown({
	menuController,
	event,
	sending,
	send,
	cancel,
}: HandlePromptEditorKeyDownOptions): boolean {
	if (menuController.handleKeyDown(event)) {
		return true;
	}

	if (event.key === 'Enter' && !event.shiftKey && !sending) {
		event.preventDefault();
		send();
		return true;
	}

	if (event.key === 'Escape' && sending) {
		event.preventDefault();
		cancel();
		return true;
	}

	return false;
}
