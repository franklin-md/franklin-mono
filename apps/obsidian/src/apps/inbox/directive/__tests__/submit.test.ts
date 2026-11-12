// @vitest-environment jsdom
import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../../../../shared/directives/registry.js';
import { createDirectiveTestPersistence } from '../../../../shared/directives/testing/persistence.js';
import { createDirectiveTestEditor } from '../../../../shared/directives/testing/editor.js';
import type { InboxController } from '../../controller/controller.js';
import { submitInboxSelection } from '../submit.js';
import type { InboxQuestionDirectiveState } from '../types.js';

describe('submitting a source question', () => {
	it('keeps the original source and appends to its last selected line after asynchronous saves and edits', async () => {
		const target = createDirectiveTestEditor('one\ntwo\nthree');
		target.cm.dispatch({ selection: { anchor: 1, head: 7 } });
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const definition = registry.registerDirective<InboxQuestionDirectiveState>(
			'inbox-question',
			() => null,
		);
		let finish!: (id: string) => void;
		const add = vi.fn(
			(_text: string, _parent?: string, _source?: unknown) =>
				new Promise<string>((resolve) => {
					finish = resolve;
				}),
		);
		const inbox = {
			add,
			state: { get: () => ({ questions: [{ id: 'question-id' }] }) },
		} as unknown as InboxController;
		try {
			const pending = submitInboxSelection({
				editor: target.editor,
				view: target.info,
				inbox,
				definition,
			});
			target.cm.dispatch({ changes: { from: 0, insert: 'new\n' } });
			target.cm.dispatch({ selection: { anchor: 0 } });
			finish('question-id');
			await pending;
			const instance = definition.instances()[0]!;
			expect(target.editor.getValue()).toBe(
				`new\none\ntwo ${instance.text}\nthree`,
			);
			expect(instance.state.get()).toEqual({ questionId: 'question-id' });
			expect(add.mock.calls[0]?.[0]).toBe('ne\ntwo');
		} finally {
			target.destroy();
			await registry.dispose();
		}
	});

	it('strips existing directive references from the submitted question and context', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const definition = registry.registerDirective<InboxQuestionDirectiveState>(
			'inbox-question',
			() => null,
		);
		const previous = await definition.create({ questionId: 'previous' });
		const target = createDirectiveTestEditor(`Why? ${previous.text}`);
		const add = vi.fn(
			async (_text: string, _parent?: string, _source?: unknown) => 'next',
		);
		try {
			await submitInboxSelection({
				editor: target.editor,
				view: target.info,
				inbox: {
					add,
					state: { get: () => ({ questions: [{ id: 'next' }] }) },
				} as unknown as InboxController,
				definition,
			});
			expect(add.mock.calls[0]?.[0]).toBe('Why?');
			expect(JSON.stringify(add.mock.calls)).not.toContain(previous.text);
			expect(target.editor.getValue()).toContain(previous.text);
			expect(definition.instances()).toHaveLength(2);
		} finally {
			target.destroy();
			await registry.dispose();
		}
	});
	it('does not insert a pill when the question was deleted while its instance was being saved', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const definition = registry.registerDirective<InboxQuestionDirectiveState>(
			'inbox-question',
			() => null,
		);
		const target = createDirectiveTestEditor('Question');
		try {
			await expect(
				submitInboxSelection({
					editor: target.editor,
					view: target.info,
					definition,
					inbox: {
						add: async () => 'gone',
						state: { get: () => ({ questions: [] }) },
					} as unknown as InboxController,
				}),
			).rejects.toThrow('deleted');
			expect(target.editor.getValue()).toBe('Question');
		} finally {
			target.destroy();
			await registry.dispose();
		}
	});
});
