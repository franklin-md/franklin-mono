import { EditorSelection } from '@codemirror/state';
import { createStore } from '@franklin/agent';
import type { ReadonlyStore } from '@franklin/agent';
import type { EditorView } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import type { App, Editor, MarkdownFileInfo, MarkdownView } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import { parseDirectives } from '../../../shared/directives/syntax/parse.js';
import { findDirectiveRanges } from '../../../shared/directives/scribe/find.js';
import type { QuickEditState } from '../types.js';
import type { QuickEditController } from '../execution/controller.js';
import { quickEditError } from '../error.js';
import { quickEditChange } from './change.js';
import { cancelQuickEdit } from './cancel.js';
import { draftEnd } from './draft/end.js';
import { findQuickEditDraft } from './draft/find.js';
import { quickEditComposer, setQuickEditComposer } from './state.js';
import { quickEditView } from './editor.js';
import { insertQuickEditPrompt } from './insert.js';
import type { DiffClient } from '../../../shared/diff/client.js';
import { removeQuickEdit } from './remove.js';
import { promptCursor } from './draft/cursor.js';

type Options = {
	app: App;
	diff: DiffClient;
	definition: DirectiveDefinition<QuickEditState>;
	execution: QuickEditController;
	report: (error: unknown) => void;
};

export class QuickEditInteraction {
	private active: EditorView | undefined;
	private readonly composingStore = createStore<string | null>(null);
	readonly composing: ReadonlyStore<string | null> = this.composingStore;
	private creating = false;
	private submitting = false;
	private closed = false;

	constructor(private readonly options: Options) {}

	syncComposer(view: EditorView, id: string | null): void {
		if (this.closed || (!id && this.active !== view)) return;
		this.active = id ? view : undefined;
		this.composingStore.set(() => id);
	}

	async begin(editor: Editor, info: MarkdownFileInfo): Promise<void> {
		await this.compose(editor, info);
	}

	async runPreset(
		editor: Editor,
		info: MarkdownFileInfo,
		prompt: string,
	): Promise<void> {
		if (!prompt.trim()) throw new Error('The preset prompt is empty');
		await this.compose(editor, info, prompt);
		const view = quickEditView(editor);
		if (view) await this.submitRequest(view);
	}

	private async compose(
		editor: Editor,
		info: MarkdownFileInfo,
		preset?: string,
	): Promise<void> {
		this.assertIdle();
		if (this.creating) {
			if (preset !== undefined) throw new Error('Quick edit is opening');
			return;
		}
		if (this.active?.dom.isConnected) {
			const active = this.active.state.field(quickEditComposer, false);
			if (active && preset !== undefined)
				throw new Error('Finish or cancel the current quick edit first');
			if (active && this.focus(this.active, active.id)) return;
		}
		const view = quickEditView(editor);
		if (!view?.state.field(editorLivePreviewField, false) || !info.file)
			throw new Error('Quick edit requires a Markdown note in Live Preview');
		const snapshot = view.state.doc;
		const selection = view.state.selection.main;
		const existing = parseDirectives(snapshot.toString()).find(
			(token) =>
				token.name === 'quick-edit' &&
				selection.head >= token.from &&
				selection.head <= token.to,
		);
		if (existing) {
			if (preset !== undefined)
				throw new Error('Finish or cancel the current quick edit first');
			await this.open(existing.id);
			return;
		}
		this.creating = true;
		try {
			await insertQuickEditPrompt({
				view,
				info,
				definition: this.options.definition,
				preset,
				isClosed: () => this.closed,
			});
			this.active = view;
		} finally {
			this.creating = false;
		}
	}

	async open(id: string): Promise<void> {
		this.assertIdle();
		const instance = this.options.definition.get(id);
		if (!instance) throw new Error('Quick edit no longer exists');
		const { app } = this.options;
		const path = instance.state.get().path;
		const file = app.vault.getFileByPath(path);
		if (!file) throw new Error('The original note no longer exists');
		if (this.active?.dom.isConnected) {
			const active = this.active.state.field(quickEditComposer, false);
			if (active && active.id !== id)
				throw new Error('Finish or cancel the current quick edit first');
		}
		let note = this.note(path);
		if (!note) {
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(file, { active: true });
			note = this.note(path);
		}
		if (!note)
			throw new Error(
				'Open the original note in Live Preview to amend this request',
			);
		const view = quickEditView(note.editor);
		if (!view?.state.field(editorLivePreviewField, false))
			throw new Error('Switch the original note to Live Preview');
		if (this.focus(view, id)) {
			this.active = view;
			return;
		}
		const source = view.state.doc.toString();
		const tokens = findDirectiveRanges(source, instance);
		const token = tokens[0];
		if (tokens.length !== 1 || !token)
			throw new Error(
				'Remove copied directives from the original note before amending',
			);
		const draft = findQuickEditDraft(source, id);
		const original = view.state.selection.main;
		const text = draft ? '' : instance.state.get().prompt + draftEnd(id);
		const changes = view.state.changes(
			text ? { from: token.to, to: token.to, insert: text } : [],
		);
		view.dispatch(
			quickEditChange(
				view.state,
				text ? [{ from: token.to, to: token.to, text }] : [],
				[
					setQuickEditComposer.of({
						id,
						fresh: instance.state.get().status === 'ready',
						pending: false,
						original: {
							anchor: changes.mapPos(original.anchor, 1),
							head: changes.mapPos(original.head, 1),
							text:
								instance.state.get().status === 'ready'
									? instance.state.get().prompt
									: '',
							baseline: instance.state.get().selectionBaseline,
						},
					}),
				],
				promptCursor(
					draft?.promptFrom ?? token.to,
					draft?.promptTo ?? token.to + instance.state.get().prompt.length,
				),
			),
		);
		this.active = view;
		view.focus();
	}

	submit(view: EditorView): void {
		void this.submitRequest(view).catch(this.options.report);
	}

	cancel(view: EditorView): void {
		const change = cancelQuickEdit(view.state);
		if (!change) return;
		view.dispatch(change);
		this.active = undefined;
		view.focus();
	}

	dispose(): void {
		this.closed = true;
		this.active = undefined;
		this.composingStore.set(() => null);
	}

	private async submitRequest(view: EditorView): Promise<void> {
		if (this.submitting) return;
		this.assertIdle();
		const composer = view.state.field(quickEditComposer);
		const draft =
			composer && findQuickEditDraft(view.state.doc.toString(), composer.id);
		if (!composer || !draft || composer.pending) return;
		const prompt = view.state.sliceDoc(draft.promptFrom, draft.promptTo).trim();
		if (!prompt) return;
		const instance = this.options.definition.get(composer.id);
		if (!instance) throw new Error('Quick edit no longer exists');
		const line = view.state.doc.lineAt(draft.from).number - 1;
		this.submitting = true;
		view.dispatch({
			effects: setQuickEditComposer.of({ ...composer, pending: true }),
		});
		try {
			await instance.update((state) => {
				state.prompt = prompt;
				state.line = line;
			});
			if (this.closed) return;
			const current = findQuickEditDraft(
				view.state.doc.toString(),
				instance.id,
			);
			if (!current)
				throw new Error('The request was removed before submission');
			view.dispatch(
				quickEditChange(
					view.state,
					[{ from: current.promptFrom, to: current.to, text: '' }],
					[setQuickEditComposer.of(null)],
					EditorSelection.single(current.promptFrom),
				),
			);
			this.active = undefined;
			const note = this.note(instance.state.get().path);
			if (!note || quickEditView(note.editor) !== view)
				throw new Error(
					'The original editor closed before submission. Reopen the request to retry.',
				);
			await note.save();
			await this.options.execution.execute(instance.id, prompt);
			if (instance.state.get().status === 'done') {
				await removeQuickEdit(instance, this.options.diff);
				await this.note(instance.state.get().path)?.save();
			}
		} catch (error) {
			const current = view.state.field(quickEditComposer, false);
			if (current?.id === composer.id)
				view.dispatch({
					effects: setQuickEditComposer.of({ ...current, pending: false }),
				});
			else
				await instance.update((state) => {
					state.status = 'failed';
					state.error = quickEditError(error);
				});
			throw error;
		} finally {
			this.submitting = false;
		}
	}

	private focus(view: EditorView, id: string): boolean {
		if (view.state.field(quickEditComposer, false)?.id !== id) return false;
		const draft = findQuickEditDraft(view.state.doc.toString(), id);
		if (!draft) return false;
		view.dispatch({
			selection: promptCursor(draft.promptFrom, draft.promptTo),
			scrollIntoView: true,
		});
		view.focus();
		return true;
	}

	private note(path: string): MarkdownView | undefined {
		let note: MarkdownView | undefined;
		this.options.app.workspace.iterateAllLeaves((leaf) => {
			if (note || leaf.view.getViewType() !== 'markdown') return;
			const view = leaf.view as MarkdownView;
			if (view.file?.path === path && view.getMode() === 'source') note = view;
		});
		return note;
	}

	private assertIdle(): void {
		if (this.closed) throw new Error('Quick edit is closed');
		if (this.options.execution.running)
			throw new Error('Stop the running quick edit before starting another');
		if (this.submitting) throw new Error('Quick edit is being submitted');
	}
}
