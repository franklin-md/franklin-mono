import { z } from 'zod';

import { createStore } from '../../../store/index.js';
import type { Store } from '../../../store/index.js';
import type { Extension, ExtensionAPI } from '../../types/index.js';
import { formatTodos } from './format.js';
import type { Todo } from './types.js';

/**
 * Extension that gives agents persistent task memory via tools
 * (`add_todo`, `complete_todo`, `list_todos`) and injects active
 * todos into every prompt.
 *
 * Exposes a `todos` store for UI binding and direct mutation.
 */
export class TodoExtension implements Extension {
	readonly name = 'todo';
	readonly todos: Store<Todo[]> = createStore<Todo[]>([]);

	async setup(api: ExtensionAPI): Promise<void> {
		const { todos } = this;

		api.registerTool({
			name: 'add_todo',
			description: 'Add a new todo item',
			schema: z.object({ text: z.string() }),
			async execute(params: { text: string }) {
				const id = crypto.randomUUID();
				const now = Date.now();
				todos.set((draft) => {
					draft.push({
						id,
						text: params.text,
						completed: false,
						createdAt: now,
					});
				});
				return { id };
			},
		});

		api.registerTool({
			name: 'complete_todo',
			description: 'Mark a todo item as completed',
			schema: z.object({ id: z.string() }),
			async execute(params: { id: string }) {
				const todo = todos.get().find((t) => t.id === params.id);
				if (!todo) {
					throw new Error(`Todo not found: ${params.id}`);
				}
				todos.set((draft) => {
					const item = draft.find((t) => t.id === params.id);
					if (item) item.completed = true;
				});
				return { ok: true };
			},
		});

		api.registerTool({
			name: 'list_todos',
			description: 'List all todo items',
			schema: z.object({}),
			async execute() {
				return { todos: todos.get() };
			},
		});

		api.on('prompt', async (ctx) => {
			const formatted = formatTodos(todos.get());
			if (!formatted) return undefined;
			return {
				prompt: [{ type: 'text' as const, text: formatted }, ...ctx.prompt],
			};
		});
	}
}
