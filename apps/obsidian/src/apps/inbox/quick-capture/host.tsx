import type { App, Editor, MarkdownFileInfo } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { EditorPopoverSession } from '../../../shared/ui/editor-popover/types.js';
import { mountEditorPopover } from '../../../shared/ui/editor-popover/mount.js';
import type { InboxController } from '../controller/controller.js';
import { captureInboxSelection } from '../directive/capture.js';
import type { InboxQuestionDirectiveState } from '../directive/types.js';
import { CapturePanel } from './panel.js';
import type { CaptureAction } from './types.js';

type Options = {
	app: App;
	inbox: InboxController;
	definition: DirectiveDefinition<InboxQuestionDirectiveState>;
	onError: (error: unknown) => void;
	onSuccess: (action: CaptureAction) => void;
};

export class InboxCaptureChooser {
	private active?: EditorPopoverSession;
	private readonly pending = new Set<Promise<void>>();
	private disposed = false;
	constructor(private readonly options: Options) {}
	get isOpen(): boolean {
		return !!this.active;
	}

	open(editor: Editor, view: MarkdownFileInfo): void {
		if (this.disposed) return;
		if (this.active) {
			this.active.focus();
			return;
		}
		const { app, inbox, definition, onError, onSuccess } = this.options;
		const selection = captureInboxSelection({
			editor,
			view,
			inbox,
			definition,
		});
		if (!selection) return;
		let closed = false;
		let running = false;
		let active: EditorPopoverSession | undefined;
		try {
			active = mountEditorPopover({
				app,
				editor,
				info: view,
				validate: () => {
					selection.target.resolve();
				},
				onClose: () => {
					closed = true;
					if (this.active === active) this.active = undefined;
					if (!running) selection.dispose();
				},
				render: (session) => (
					<CapturePanel
						anchor={session.anchor}
						onClose={session.close}
						onContent={session.contentRef}
						onSubmit={(action) => submit(action)}
					/>
				),
			});
			this.active = active;
		} catch (error) {
			selection.dispose();
			throw error;
		}
		const close = active.close;
		const submit = (action: CaptureAction): Promise<void> => {
			running = true;
			const task = (async () => {
				try {
					if (action === 'quick-add') await selection.submit();
					else
						await inbox.thoughtDumps.add(
							selection.source.quote,
							selection.source,
						);
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
			const settled = () => {
				this.pending.delete(task);
			};
			void task.then(settled, settled);
			return task;
		};
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.active?.close(false);
		await Promise.allSettled(this.pending);
	}
}
