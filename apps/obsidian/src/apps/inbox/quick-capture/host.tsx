import type { App, Editor, MarkdownFileInfo } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import { createMounter } from '../../../shared/ui/mount.js';
import type { InboxController } from '../controller/controller.js';
import { captureInboxSelection } from '../directive/capture.js';
import type { InboxQuestionDirectiveState } from '../directive/types.js';
import { createCaptureAnchor } from './anchor.js';
import { CapturePanel } from './panel.js';
import type { CaptureAction } from './types.js';

type Options = {
	app: App;
	inbox: InboxController;
	definition: DirectiveDefinition<InboxQuestionDirectiveState>;
	onError: (error: unknown) => void;
	onSuccess: (action: CaptureAction) => void;
};
type ActiveCapture = { focus: () => void; close: (restoreFocus: boolean) => void };

export class InboxCaptureChooser {
	private active?: ActiveCapture;
	private readonly pending = new Set<Promise<void>>();
	private disposed = false;
	constructor(private readonly options: Options) {}
	get isOpen(): boolean { return !!this.active; }

	open(editor: Editor, view: MarkdownFileInfo): void {
		if (this.disposed) return;
		if (this.active) { this.active.focus(); return; }
		const { app, inbox, definition, onError, onSuccess } = this.options;
		const selection = captureInboxSelection({ editor, view, inbox, definition });
		if (!selection) return;
		let anchor;
		try { anchor = createCaptureAnchor(editor, selection.target); }
		catch (error) { selection.dispose(); throw error; }
		const doc = anchor.contextElement.ownerDocument;
		const win = doc.defaultView;
		if (!win) { selection.dispose(); return; }
		const host = doc.createElement('div');
		const mounter = createMounter();
		let panel: HTMLDivElement | null = null;
		let closed = false;
		let running = false;
		const file = view.file;
		const cleanup: (() => void)[] = [];
		const focus = () => {
			const button = panel?.querySelector<HTMLButtonElement>('button:not([disabled])');
			(button ?? panel)?.focus();
		};
		const close = (restoreFocus: boolean) => {
			if (closed) return;
			closed = true;
			if (this.active === active) this.active = undefined;
			for (const dispose of cleanup) dispose();
			if (!running) selection.dispose();
			// A close can originate in a Radix effect; finish that commit before unmounting.
			win.queueMicrotask(() => { mounter.unmount(); host.remove(); });
			if (restoreFocus && anchor.contextElement.isConnected && view.file === file) editor.focus();
		};
		const active = { focus, close };
		const submit = (action: CaptureAction): Promise<void> => {
			running = true;
			const task = (async () => {
				try {
					if (action === 'quick-add') await selection.submit();
					else await inbox.thoughtDumps.add(selection.source.quote, selection.source);
					onSuccess(action);
					close(true);
				} catch (error) {
					if (closed) onError(error);
					throw error;
				} finally {
					running = false;
					if (closed) selection.dispose();
				}
			})();
			this.pending.add(task);
			const settled = () => { this.pending.delete(task); };
			void task.then(settled, settled);
			return task;
		};
		const validate = () => {
			try {
				if (!anchor.contextElement.isConnected || view.file !== file) { close(false); return; }
				selection.target.resolve();
			} catch { close(false); }
		};
		try {
			doc.body.append(host);
			this.active = active;
			for (const event of ['editor-change', 'active-leaf-change'] as const) {
				const ref = app.workspace.on(event, validate);
				cleanup.push(() => app.workspace.offref(ref));
			}
			cleanup.push(anchor.contextElement.onWindowMigrated(() => close(false)));
			const unload = () => close(false);
			win.addEventListener('pagehide', unload);
			cleanup.push(() => win.removeEventListener('pagehide', unload));
			mounter.mount(host, <CapturePanel anchor={anchor} onSubmit={submit} onClose={close}
				onContent={(element) => { panel = element; }} />);
		} catch (error) { close(false); throw error; }
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.active?.close(false);
		await Promise.allSettled(this.pending);
	}
}
