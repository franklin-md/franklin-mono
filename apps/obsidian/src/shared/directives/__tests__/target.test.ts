// @vitest-environment jsdom
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { App, Editor, MarkdownFileInfo } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { captureDirectiveTarget } from '../scribe/target.js';
import { directiveAnchors } from '../scribe/anchors.js';
import { DirectiveScribe } from '../scribe/operations.js';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from '../testing/persistence.js';
import { createDirectiveTestEditor } from '../testing/editor.js';

describe('targeted directive insertion', () => {
	it('tracks the original line through edits and ignores the active pane and cursor', async () => {
		const { cm, editor, info } = createDirectiveTestEditor(
			'first\nquestion\nlast',
		);
		const target = captureDirectiveTarget(editor, info, 1);
		try {
			cm.dispatch({ changes: { from: 0, insert: 'added\n' } });
			cm.dispatch({
				changes: { from: cm.state.doc.line(3).to, insert: ' edited' },
			});
			const registry = await DirectiveRegistry.create({
				app: { workspace: { activeEditor: null } } as unknown as App,
				persistence: createDirectiveTestPersistence(),
			});
			const instance = await registry
				.registerDirective('test', () => null)
				.create({});
			await new DirectiveScribe(instance).write(target);
			expect(cm.state.doc.toString()).toBe(
				`added\nfirst\nquestion edited ${instance.text}\nlast`,
			);
			target.dispose();
			expect(cm.state.field(directiveAnchors.field).size).toBe(0);
		} finally {
			target.dispose();
			cm.destroy();
		}
	});

	it('rejects a target whose source line was deleted', () => {
		const cm = new EditorView({
			state: EditorState.create({
				doc: 'question\nnext',
				extensions: [directiveAnchors.field],
			}),
		});
		const editor = { cm } as unknown as Editor;
		const target = captureDirectiveTarget(
			editor,
			{ file: { path: 'note.md' } } as MarkdownFileInfo,
			0,
		);
		try {
			cm.dispatch({ changes: { from: 0, to: 9 } });
			expect(() => target.resolve()).toThrow('changed');
		} finally {
			target.dispose();
			cm.destroy();
		}
	});
});
