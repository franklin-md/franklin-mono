import { createMounter } from '../mount.js';
import type { EventRef } from 'obsidian';
import { createEditorAnchor } from './anchor.js';
import type { EditorPopoverOptions, EditorPopoverSession } from './types.js';

export function mountEditorPopover({
	app,
	editor,
	info,
	validate,
	onClose,
	render,
}: EditorPopoverOptions): EditorPopoverSession {
	const anchor = createEditorAnchor(editor, validate);
	const doc = anchor.contextElement.ownerDocument;
	const win = doc.defaultView;
	if (!win) {
		anchor.dispose();
		throw new Error('The editor window closed');
	}
	const host = doc.createElement('div');
	const mounter = createMounter();
	let panel: HTMLDivElement | null = null;
	let closed = false;
	const file = info.file;
	const cleanup: (() => void)[] = [anchor.dispose];
	const session: EditorPopoverSession = {
		anchor,
		contentRef: (element) => {
			panel = element;
		},
		focus: () => {
			(
				panel?.querySelector<HTMLElement>(
					'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
				) ?? panel
			)?.focus();
		},
		close: (restoreFocus) => {
			if (closed) return;
			closed = true;
			// Radix can dismiss during an effect. Unmount after its commit finishes.
			win.queueMicrotask(() => {
				try {
					mounter.unmount();
				} finally {
					host.remove();
				}
			});
			for (const dispose of cleanup) dispose();
			onClose();
			if (
				restoreFocus &&
				anchor.contextElement.isConnected &&
				info.file === file
			)
				editor.focus();
		},
	};
	const check = () => {
		try {
			if (!anchor.contextElement.isConnected || info.file !== file)
				throw new Error('The originating editor closed');
			validate();
		} catch {
			session.close(false);
		}
	};
	try {
		doc.body.append(host);
		const track = (ref: EventRef) => {
			// Track each registration immediately so a later failure releases it.
			cleanup.push(() => app.workspace.offref(ref));
		};
		track(app.workspace.on('editor-change', check));
		track(app.workspace.on('active-leaf-change', check));
		track(app.workspace.on('file-open', check));
		cleanup.push(
			anchor.contextElement.onWindowMigrated(() => session.close(false)),
		);
		const unload = () => session.close(false);
		win.addEventListener('pagehide', unload);
		cleanup.push(() => win.removeEventListener('pagehide', unload));
		mounter.mount(host, render(session));
	} catch (error) {
		session.close(false);
		throw error;
	}
	return session;
}
