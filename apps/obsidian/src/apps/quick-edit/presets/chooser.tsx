import { editorLivePreviewField } from 'obsidian';
import type { App, Editor, MarkdownFileInfo } from 'obsidian';
import { mountEditorPopover } from '../../../shared/ui/editor-popover/mount.js';
import type { EditorPopoverSession } from '../../../shared/ui/editor-popover/types.js';
import type { QuickEditInteraction } from '../interaction/composer.js';
import { quickEditView } from '../interaction/editor.js';
import type { QuickEditPreset } from './types.js';
import { PresetPanel } from './panel.js';

type Options = {
	app: App;
	interaction: QuickEditInteraction;
	getPresets: () => readonly QuickEditPreset[];
	report: (error: unknown) => void;
};

export class QuickEditPresetChooser {
	private active?: EditorPopoverSession;
	private readonly pending = new Set<Promise<void>>();
	private disposed = false;
	constructor(private readonly options: Options) {}

	open(editor: Editor, info: MarkdownFileInfo): void {
		if (this.disposed) return;
		if (this.active) {
			this.active.focus();
			return;
		}
		const cm = quickEditView(editor);
		if (!cm?.state.field(editorLivePreviewField, false) || !info.file)
			throw new Error('Quick edit requires a Markdown note in Live Preview');
		if (this.options.interaction.composing.get())
			throw new Error('Finish or cancel the current quick edit first');
		const file = info.file;
		const snapshot = cm.state.doc;
		const selection = cm.state.selection;
		// Resolve prompts now: settings edits must not change the action already shown.
		const presets = structuredClone(this.options.getPresets());
		const validate = () => {
			if (
				info.file !== file ||
				!cm.state.doc.eq(snapshot) ||
				!cm.state.field(editorLivePreviewField, false)
			)
				throw new Error('The note changed. Open the preset chooser again.');
		};
		let accepted = false;
		const session = mountEditorPopover({
			app: this.options.app,
			editor,
			info,
			validate,
			onClose: () => {
				this.active = undefined;
			},
			render: (current) => (
				<PresetPanel
					anchor={current.anchor}
					presets={presets}
					onClose={current.close}
					onContent={current.contentRef}
					onSelect={(preset) => {
						if (accepted || this.active !== current) return;
						accepted = true;
						const task = (async () => {
							try {
								validate();
								cm.dispatch({ selection });
								current.close(true);
								await this.options.interaction.runPreset(
									editor,
									info,
									preset.prompt,
								);
							} catch (error) {
								current.close(true);
								if (!this.disposed) this.options.report(error);
							}
						})();
						this.pending.add(task);
						void task.then(() => this.pending.delete(task));
					}}
				/>
			),
		});
		this.active = session;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.active?.close(false);
		await Promise.allSettled(this.pending);
	}
}
