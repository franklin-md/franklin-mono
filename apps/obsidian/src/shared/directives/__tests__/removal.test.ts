// @vitest-environment jsdom
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDirectiveRemovalExtension } from '../removal/extension.js';
import { createDirectiveTestRegistry } from '../testing/registry.js';

const Renderer = () => null;
let view: EditorView | undefined;

afterEach(() => {
	view?.destroy();
	view = undefined;
});

async function setup(doc: (text: string) => string) {
	const registry = await createDirectiveTestRegistry();
	const definition = registry.registerDirective('counter', Renderer);
	const instance = await definition.create({});
	const removed = vi.fn();
	definition.onRemoved(removed);
	view = new EditorView({
		state: EditorState.create({
			doc: doc(instance.text),
			extensions: [history(), createDirectiveRemovalExtension(registry)],
		}),
	});
	return { registry, definition, instance, removed, view };
}

function replace(
	view: EditorView,
	text: string,
	userEvent?: string,
	insert = '',
) {
	const from = view.state.doc.toString().indexOf(text);
	view.dispatch({
		changes: { from, to: from + text.length, insert },
		userEvent,
	});
}

describe('directive removal', () => {
	it('reports each reference whose whole text is deleted, typed over or pasted over while copies remain', async () => {
		const { instance, removed, view } = await setup(
			(text) => `${text} ${text} (${text}) ${text}`,
		);
		replace(view, instance.text, 'delete.backward');
		replace(view, instance.text, 'input.type', 'x');
		replace(view, `(${instance.text})`, 'delete.selection');
		replace(view, instance.text, 'input.paste', 'pasted');
		expect(view.state.doc.toString()).toBe(' x  pasted');
		expect(removed).toHaveBeenCalledTimes(4);
		expect(removed).toHaveBeenCalledWith(instance);
	});

	it('ignores cutting a reference and editing inside its text', async () => {
		const { instance, removed, view } = await setup(
			(text) => `${text} ${text} ${text}`,
		);
		const length = instance.text.length;
		replace(view, instance.text, 'delete.cut');
		view.dispatch({
			changes: { from: length, to: length + 1 },
			userEvent: 'delete.backward',
		});
		view.dispatch({
			changes: { from: length + 2, insert: 'x' },
			userEvent: 'input.type',
		});
		expect(removed).not.toHaveBeenCalled();
	});

	it('ignores undo, redo, programmatic edits and edits beside a reference', async () => {
		const { instance, removed, view } = await setup((text) => `a ${text} b`);
		replace(view, instance.text, 'delete.selection');
		undo(view);
		redo(view);
		undo(view);
		replace(view, 'a', 'delete.backward');
		view.dispatch({
			changes: { from: view.state.doc.length, insert: '!' },
			userEvent: 'input.type',
		});
		replace(view, instance.text);
		expect(view.state.doc.toString()).toBe('  b!');
		expect(removed).toHaveBeenCalledOnce();
	});

	it('ignores typing at a reference edge, pasting the same reference back and deleting code examples', async () => {
		const { instance, removed, view } = await setup(
			(text) => `${text} \`${text}\``,
		);
		view.dispatch({
			changes: [
				{ from: 0, insert: 'a' },
				{ from: instance.text.length, insert: 'b' },
			],
			userEvent: 'input.type',
		});
		replace(view, instance.text, 'input.paste', instance.text);
		replace(view, `\`${instance.text}\``, 'delete.backward');
		expect(view.state.doc.toString()).toBe(`a${instance.text}b `);
		expect(removed).not.toHaveBeenCalled();
	});

	it('ignores unknown instances and stops reporting after unsubscribing or disposal', async () => {
		const { registry, definition, instance, removed, view } = await setup(
			(text) => `${text}${text}`,
		);
		const unknown = `:::franklin:counter:${crypto.randomUUID()}:::`;
		view.dispatch({ changes: { from: 0, insert: unknown } });
		replace(view, unknown, 'delete.backward');
		const unsubscribed = vi.fn();
		definition.onRemoved(unsubscribed)();
		replace(view, instance.text, 'delete.backward');
		await registry.dispose();
		replace(view, instance.text, 'delete.backward');
		expect(removed).toHaveBeenCalledOnce();
		expect(unsubscribed).not.toHaveBeenCalled();
	});
});
