import { createExtension } from '../../algebra/index.js';
import type { CoreAPI } from '../../modules/core/index.js';
import type { StoreAPI } from '../../modules/store/index.js';
import type { StoreRuntime } from '../../modules/store/runtime.js';
import { createTodoControl } from './control.js';
import { formatTodos } from './format.js';
import { todoKey } from './key.js';
import { addTodoSpec, completeTodoSpec, listTodosSpec } from './tools.js';

/**
 * Extension that gives agents persistent task memory via tools
 * (`add_todo`, `complete_todo`, `list_todos`) and injects active
 * todos into every prompt.
 */
export function todoExtension() {
	return createExtension<[CoreAPI, StoreAPI], [StoreRuntime]>((api) => {
		api.registerStore(todoKey, [], 'shared');

		api.registerTool(addTodoSpec, async ({ text }, ctx) => {
			const control = createTodoControl(ctx.getStore(todoKey));
			const todo = control.addTodo(text);
			return JSON.stringify({ id: todo.id });
		});

		api.registerTool(completeTodoSpec, async ({ id }, ctx) => {
			const control = createTodoControl(ctx.getStore(todoKey));
			control.setStatus(id, true);
			return JSON.stringify({ ok: true });
		});

		api.registerTool(listTodosSpec, async (_args, ctx) => {
			const control = createTodoControl(ctx.getStore(todoKey));
			return JSON.stringify({ todos: control.todos() });
		});

		api.on('prompt', (prompt, ctx) => {
			const store = ctx.getStore(todoKey);
			const formatted = formatTodos(store.get());
			if (formatted) {
				prompt.prependContent({ type: 'text', text: formatted });
			}
		});
	});
}
