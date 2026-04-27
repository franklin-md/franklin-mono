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
