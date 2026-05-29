import { describe, expect, it } from 'vitest';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import type { StreamEvent, UserMessage } from '@franklin/mini-acp';

import { combineAll } from '../../modules/state/index.js';
import { createCoreStateModule } from '../../modules/core/module/index.js';
import { StoreRegistry } from '../../modules/store/api/registry/index.js';
import { createStoreStateModule } from '../../modules/store/state-module.js';
import { createRuntime } from '../../testing/index.js';
import { viewingContextExtension } from '../viewing-context/bundle.js';
import type { ViewingContextState } from '../viewing-context/types.js';

async function drain(iterable: AsyncIterable<StreamEvent>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the mock prompt so the runtime sends context.
	}
}

async function createViewingContextRuntime() {
	const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
	const module = combineAll([
		createCoreStateModule(mock.connector),
		createStoreStateModule(new StoreRegistry()),
	] as const);
	const runtime = await createRuntime(module, module.emptyState(), [
		viewingContextExtension.extension,
	]);
	return { mock, runtime };
}

function viewingContextPromptContent(prompt: UserMessage): string | undefined {
	const entry = prompt.content.find(
		(content) =>
			content.type === 'text' && content.text.includes('<viewing_context>'),
	);
	return entry?.type === 'text' ? entry.text : undefined;
}

describe('viewingContextExtension', () => {
	it('initializes the viewing context store enabled with no references', async () => {
		const { runtime } = await createViewingContextRuntime();

		try {
			expect(
				runtime.getStore(viewingContextExtension.keys.viewingContext).get(),
			).toEqual({
				enabled: true,
				references: [],
			} satisfies ViewingContextState);
		} finally {
			await runtime.dispose();
		}
	});

	it('updates enabled state and references through the store', async () => {
		const { runtime } = await createViewingContextRuntime();

		try {
			const store = runtime.getStore(
				viewingContextExtension.keys.viewingContext,
			);

			store.set((draft) => {
				draft.enabled = false;
				draft.references = [{ type: 'file', locator: 'notes/current.md' }];
			});

			expect(store.get()).toEqual({
				enabled: false,
				references: [{ type: 'file', locator: 'notes/current.md' }],
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('adds viewed references to the prompt when enabled', async () => {
		const { mock, runtime } = await createViewingContextRuntime();

		try {
			const store = runtime.getStore(
				viewingContextExtension.keys.viewingContext,
			);
			store.set((draft) => {
				draft.references = [
					{ type: 'file', locator: 'notes/current.md' },
					{
						type: 'file',
						locator: 'papers/context.pdf',
						selector: 'pages=1-2',
					},
				];
			});

			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'What should I do next?' }],
				}),
			);

			const prompt = mock.calls().prompts[0];
			if (!prompt) throw new Error('Expected a prompt');
			expect(prompt.content[0]).toEqual({
				type: 'text',
				text: 'What should I do next?',
			});
			expect(viewingContextPromptContent(prompt)).toBe(
				[
					'<viewing_context>',
					'The user is currently viewing these resources:',
					'- type=file; locator=notes/current.md',
					'- type=file; locator=papers/context.pdf; selector=pages=1-2',
					'</viewing_context>',
				].join('\n'),
			);
			expect(mock.context().systemPrompt).toContain(
				'resources the user is currently viewing',
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('does not add viewed references to the prompt when disabled', async () => {
		const { mock, runtime } = await createViewingContextRuntime();

		try {
			const store = runtime.getStore(
				viewingContextExtension.keys.viewingContext,
			);
			store.set((draft) => {
				draft.references = [{ type: 'file', locator: 'notes/current.md' }];
				draft.enabled = false;
			});

			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);

			const prompt = mock.calls().prompts[0];
			if (!prompt) throw new Error('Expected a prompt');
			expect(prompt.content).toEqual([{ type: 'text', text: 'hello' }]);
		} finally {
			await runtime.dispose();
		}
	});

	it('does not add viewed references to the prompt when the list is empty', async () => {
		const { mock, runtime } = await createViewingContextRuntime();

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);

			const prompt = mock.calls().prompts[0];
			if (!prompt) throw new Error('Expected a prompt');
			expect(prompt.content).toEqual([{ type: 'text', text: 'hello' }]);
		} finally {
			await runtime.dispose();
		}
	});
});
