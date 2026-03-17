export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	createdAt: number;
}

export interface TodoControl {
	addTodo: (text: string) => Todo;
	toggleTodo: (id: string) => void;
	setStatus: (id: string, status: boolean) => void;
	editTodo: (id: string, text: string) => void;
	clearTodos: () => void;
	todos: () => Todo[];
}
