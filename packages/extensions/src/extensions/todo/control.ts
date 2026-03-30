import type { Store } from '../../api/store/types.js';
import type { Todo, TodoControl } from './types.js';

export function createTodoControl(todos: Store<Todo[]>): TodoControl {
	return {
		addTodo: (text: string) => {
			const todo: Todo = {
				id: crypto.randomUUID(),
				text,
				completed: false,
				createdAt: Date.now(),
			};
			todos.set((draft) => {
				draft.push(todo);
			});
			return todo;
		},
		toggleTodo: (id: string) => {
			todos.set((draft) => {
				const todo = draft.find((t) => t.id === id);
				if (todo) todo.completed = !todo.completed;
			});
		},
		setStatus: (id: string, status: boolean) => {
			const found = todos.get().some((t) => t.id === id);
			if (!found) throw new Error(`Todo not found: ${id}`);
			todos.set((draft) => {
				const todo = draft.find((t) => t.id === id);
				if (todo) todo.completed = status;
			});
		},
		editTodo: (id: string, text: string) => {
			todos.set((draft) => {
				const todo = draft.find((t) => t.id === id);
				if (todo) todo.text = text;
			});
		},
		todos: () => todos.get(),
		clearTodos: () => {
			todos.set((draft) => {
				draft.length = 0;
			});
		},
	};
}
