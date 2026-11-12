// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createEditorAnchor } from '../../../../shared/ui/editor-popover/anchor.js';
import { createDirectiveTestEditor } from '../../../../shared/directives/testing/editor.js';
import { captureDirectiveTarget } from '../../../../shared/directives/scribe/target.js';

afterEach(() => {
	document.body.replaceChildren();
});

it('anchors above the invocation caret and follows document edits independently of the pill insertion point', () => {
	const editor = createDirectiveTestEditor('before after');
	document.body.append(editor.cm.dom);
	editor.cm.dispatch({ selection: { anchor: 3 } });
	const target = captureDirectiveTarget(editor.editor, editor.info, 0);
	vi.spyOn(editor.cm, 'coordsAtPos').mockImplementation((position) => ({
		left: position * 8,
		right: position * 8 + 1,
		top: 50,
		bottom: 70,
	}));
	const anchor = createEditorAnchor(editor.editor, () => {
		target.resolve();
	});
	try {
		expect(anchor.getBoundingClientRect().x).toBe(24);
		editor.cm.dispatch({ changes: { from: 0, insert: 'new\n' } });
		expect(anchor.getBoundingClientRect().x).toBe(56);
		expect(target.resolve().from).toEqual({ line: 1, ch: 12 });
	} finally {
		anchor.dispose();
		target.dispose();
		editor.destroy();
	}
});
