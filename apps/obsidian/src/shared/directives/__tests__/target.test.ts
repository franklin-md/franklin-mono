// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { captureDirectiveTarget } from '../scribe/target.js';
import { editorAnchors } from '../../obsidian/editor/anchors.js';
import { DirectiveScribe } from '../scribe/operations.js';
import { createDirectiveTestRegistry } from '../testing/registry.js';
import { createTestEditor } from '../../obsidian/editor/testing/editor.js';

describe('targeted directive insertion', () => {
	it('tracks the original line through edits and ignores the active pane and cursor', async () => {
		const { cm, editor, info } = createTestEditor('first\nquestion\nlast');
		const target = captureDirectiveTarget(editor, info, 1);
		try {
			cm.dispatch({ changes: { from: 0, insert: 'added\n' } });
			cm.dispatch({
				changes: { from: cm.state.doc.line(3).to, insert: ' edited' },
			});
			const registry = await createDirectiveTestRegistry();
			const instance = await registry
				.registerDirective('test', () => null)
				.create({});
			await new DirectiveScribe(instance).write(target);
			expect(cm.state.doc.toString()).toBe(
				`added\nfirst\nquestion edited ${instance.text}\nlast`,
			);
			target.dispose();
			expect(cm.state.field(editorAnchors).size).toBe(0);
		} finally {
			target.dispose();
			cm.destroy();
		}
	});

	it.each(['question', ''])(
		'keeps the directive on the captured line after Enter (%j)',
		async (original) => {
			const { cm, editor, info } = createTestEditor(original + '\nlast');
			const target = captureDirectiveTarget(editor, info, 0);
			try {
				cm.dispatch({
					changes: { from: original.length, insert: '\nNext' },
					selection: { anchor: original.length + 5 },
				});
				const registry = await createDirectiveTestRegistry();
				const instance = await registry
					.registerDirective('test', () => null)
					.create({});
				await new DirectiveScribe(instance).write(target);
				expect(cm.state.doc.toString()).toBe(
					(original ? original + ' ' : '') + instance.text + '\nNext\nlast',
				);
				expect(editor.getCursor()).toEqual({ line: 1, ch: 4 });
			} finally {
				target.dispose();
				cm.destroy();
			}
		},
	);

	it('rejects a target whose source line was deleted', () => {
		const { cm, editor, info } = createTestEditor('question\nnext');
		const target = captureDirectiveTarget(editor, info, 0);
		try {
			cm.dispatch({ changes: { from: 0, to: 9 } });
			expect(() => target.resolve()).toThrow('changed');
		} finally {
			target.dispose();
			cm.destroy();
		}
	});

	it('preserves a fenced code example when asked to insert a directive', async () => {
		const source = '~~~\nquestion\n~~~';
		const { cm, editor, info } = createTestEditor(source);
		const target = captureDirectiveTarget(editor, info, 1);
		try {
			const registry = await createDirectiveTestRegistry();
			const instance = await registry
				.registerDirective('test', () => null)
				.create({});
			await expect(new DirectiveScribe(instance).write(target)).rejects.toThrow(
				'literal Markdown',
			);
			expect(editor.getValue()).toBe(source);
		} finally {
			target.dispose();
			cm.destroy();
		}
	});
});
