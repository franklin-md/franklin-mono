import { z } from 'zod';
import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { StoreAPI } from '../../api/store/api.js';
import { formatTodos } from './format.js';
import { createTodoControl } from './control.js';
import { todoKey } from './key.js';
import {
	addTodoDescription,
	completeTodoDescription,
	listTodosDescription,
} from '../system_prompts.js';

/**
 * Extension that gives agents persistent task memory via tools
 * (`add_todo`, `complete_todo`, `list_todos`) and injects active
 * todos into every prompt.
 */
export function todoExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(todoKey, [], 'shared');
		const control = createTodoControl(store);

		api.registerTool({
			name: 'add_todo',
			description: addTodoDescription,
			schema: z.object({ text: z.string() }),
			async execute(params: { text: string }) {
				const todo = control.addTodo(params.text);
				return { id: todo.id };
			},
		});

		api.registerTool({
			name: 'complete_todo',
			description: completeTodoDescription,
			schema: z.object({ id: z.string() }),
			async execute(params: { id: string }) {
				control.setStatus(params.id, true);
				return { ok: true };
			},
		});

		api.registerTool({
			name: 'list_todos',
			description: listTodosDescription,
			schema: z.object({}),
			async execute() {
				return { todos: control.todos() };
			},
		});

		api.on('prompt', (params) => {
			const formatted = formatTodos(store.get());
			if (!formatted) return undefined;
			return {
				message: {
					...params.message,
					content: [
						{ type: 'text' as const, text: formatted },
						...params.message.content,
					],
				},
			};
		});
	};
}
