import type { App } from 'obsidian';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { createTestEditor } from '../../../obsidian/editor/testing/editor.js';

type WorkspaceRef = { name: string };
type TestWorkspace = {
	on: Mock<(name: string, listener: () => void) => WorkspaceRef>;
	offref: Mock<(ref: WorkspaceRef) => boolean>;
};

export function createEditorPopoverTestHost() {
	const editor = createTestEditor('before\nafter');
	editor.cm.dom.ownerDocument.body.append(editor.cm.dom);
	const focus: Mock<() => void> = vi.fn();
	editor.editor.focus = focus;
	let file = editor.info.file;
	Object.defineProperty(editor.info, 'file', { get: () => file });
	const listeners = new Map<string, () => void>();
	const workspace: TestWorkspace = {
		on: vi.fn((name: string, listener: () => void) => {
			listeners.set(name, listener);
			return { name };
		}),
		offref: vi.fn((ref: { name: string }) => listeners.delete(ref.name)),
	};
	let migrate = () => {};
	const stopMigration: Mock<() => void> = vi.fn();
	editor.cm.dom.onWindowMigrated = vi.fn(
		(listener: (win: Window) => unknown) => {
			migrate = () => {
				const win = editor.cm.dom.ownerDocument.defaultView;
				if (win) listener(win);
			};
			return stopMigration;
		},
	);
	return {
		...editor,
		app: { workspace } as unknown as App,
		workspace,
		focus,
		changeFile: () => {
			file = null;
		},
		migrate: () => migrate(),
		stopMigration,
		emit: (name: string) => listeners.get(name)?.(),
	};
}
