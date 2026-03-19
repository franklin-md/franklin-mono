import { z } from 'zod';

import { createStore } from '../../../store/index.js';
import type { Store } from '../../../store/index.js';
import type { Extension, ExtensionAPI } from '../../types/index.js';
import { formatTodos } from './format.js';
import type { Todo } from './types.js';
import { createTodoControl } from './control.js';

/**
 * Extension that gives agents persistent task memory via tools
 * (`add_todo`, `complete_todo`, `list_todos`) and injects active
 * todos into every prompt.
 *
 * Exposes a `state` store for UI binding and direct mutation.
 */
export class TodoExtension implements Extension<Todo[]> {
	readonly name = 'todo';
	readonly state: Store<Todo[]> = createStore<Todo[]>([]);

	async setup(api: ExtensionAPI): Promise<void> {
		const control = createTodoControl(this.state);

		api.registerTool({
			name: 'add_todo',
			description: 'Add a new todo item',
			schema: z.object({ text: z.string() }),
			async execute(params: { text: string }) {
				const todo = control.addTodo(params.text);
				return { id: todo.id };
			},
		});

		api.registerTool({
			name: 'complete_todo',
			description: 'Mark a todo item as completed',
			schema: z.object({ id: z.string() }),
			async execute(params: { id: string }) {
				control.setStatus(params.id, true);
				return { ok: true };
			},
		});

		api.registerTool({
			name: 'list_todos',
			description: 'List all todo items',
			schema: z.object({}),
			async execute() {
				return { todos: control.todos() };
			},
		});

		api.on('prompt', async (ctx) => {
			const formatted = formatTodos(this.state.get());
			if (!formatted) return undefined;
			return {
				prompt: [{ type: 'text' as const, text: formatted }, ...ctx.prompt],
			};
		});
	}
}
