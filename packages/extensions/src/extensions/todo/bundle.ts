import { createBundle } from '../../algebra/system/bundle/create.js';
import { todoExtension as buildTodoExtension } from './extension.js';
import { todoKey } from './key.js';
import { addTodoSpec, completeTodoSpec, listTodosSpec } from './tools.js';

export const todoExtension = createBundle({
	extension: buildTodoExtension(),
	keys: { todo: todoKey },
	tools: {
		addTodo: addTodoSpec,
		completeTodo: completeTodoSpec,
		listTodos: listTodosSpec,
	},
});
