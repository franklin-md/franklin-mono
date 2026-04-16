import type { Extension } from '../../algebra/types/extension.js';
import type { CoreAPI } from '../../systems/core/api/api.js';
import type { StoreAPI } from '../../systems/store/api/api.js';
import { formatTodos } from './format.js';
import { createTodoControl } from './control.js';
import { todoKey } from './key.js';
import { addTodoSpec, completeTodoSpec, listTodosSpec } from './tools.js';

/**
 * Extension that gives agents persistent task memory via tools
 * (`add_todo`, `complete_todo`, `list_todos`) and injects active
 * todos into every prompt.
 */
export function todoExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(todoKey, [], 'shared');
		const control = createTodoControl(store);

		api.registerTool(addTodoSpec, async ({ text }) => {
			const todo = control.addTodo(text);
			return JSON.stringify({ id: todo.id });
		});

		api.registerTool(completeTodoSpec, async ({ id }) => {
			control.setStatus(id, true);
			return JSON.stringify({ ok: true });
		});

		api.registerTool(listTodosSpec, async () =>
			JSON.stringify({ todos: control.todos() }),
		);

		api.on('prompt', (message) => {
			const formatted = formatTodos(store.get());
			if (!formatted) return undefined;
			return {
				...message,
				content: [
					{ type: 'text' as const, text: formatted },
					...message.content,
				],
			};
		});
	};
}
