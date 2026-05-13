// Runtime stub for the obsidian module (types-only package with no JS entry).
// Used as a Vite alias in vitest.config.ts so imports resolve at test time.

export class ItemView {
	contentEl = document.createElement('div');

	constructor(readonly leaf: unknown) {}
}

export class Plugin {
	app = {
		vault: {},
		workspace: {},
	};
	manifest = {};

	addCommand(): void {}

	addRibbonIcon(): void {}

	addSettingTab(): void {}

	registerView(): void {}
}

export class PluginSettingTab {
	containerEl = document.createElement('div');

	constructor(
		readonly app: unknown,
		readonly plugin: unknown,
	) {}
}

export class FileSystemAdapter {
	getBasePath(): string {
		return '';
	}
}

export class Notice {
	constructor(readonly message: string) {}
}

type MockPaneType = 'tab' | 'split' | 'window';
type MockUserEvent = MouseEvent | TouchEvent | KeyboardEvent | PointerEvent;
type MockModifier = 'Mod' | 'Ctrl' | 'Meta' | 'Shift' | 'Alt';

export const Keymap = {
	isModifier,
	isModEvent,
};

export class Setting {
	constructor(readonly containerEl: HTMLElement) {}

	setName(): this {
		return this;
	}

	setDesc(): this {
		return this;
	}

	addText(): this {
		return this;
	}
}

export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/|\/$/g, '');
}

export function getLinkpath(linktext: string): string {
	const hashIndex = linktext.indexOf('#');
	return hashIndex >= 0 ? linktext.slice(0, hashIndex) : linktext;
}

function isModifier(event: MockUserEvent, modifier: MockModifier): boolean {
	switch (modifier) {
		case 'Mod':
			return isKeyboardOrMouseEvent(event)
				? event.ctrlKey || event.metaKey
				: false;
		case 'Ctrl':
			return isKeyboardOrMouseEvent(event) ? event.ctrlKey : false;
		case 'Meta':
			return isKeyboardOrMouseEvent(event) ? event.metaKey : false;
		case 'Shift':
			return isKeyboardOrMouseEvent(event) ? event.shiftKey : false;
		case 'Alt':
			return isKeyboardOrMouseEvent(event) ? event.altKey : false;
	}
}

function isModEvent(event?: MockUserEvent | null): MockPaneType | boolean {
	if (!event) return false;
	if ('button' in event && event.button === 1) return 'tab';
	if (!isModifier(event, 'Mod')) return false;
	if (isModifier(event, 'Alt') && isModifier(event, 'Shift')) return 'window';
	if (isModifier(event, 'Alt')) return 'split';
	return 'tab';
}

function isKeyboardOrMouseEvent(
	event: MockUserEvent,
): event is MouseEvent | KeyboardEvent | PointerEvent {
	return 'ctrlKey' in event;
}
