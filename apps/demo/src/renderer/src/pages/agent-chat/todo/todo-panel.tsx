import { useMemo } from 'react';

import { createTodoControl, todoExtension } from '@franklin/extensions';
import { useAgentState } from '@franklin/react';

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	ScrollArea,
} from '@franklin/ui';

import { TodoAddForm } from './todo-add-form.js';
import { TodoItem } from './todo-item.js';

export function TodoPanel() {
	const store = useAgentState(todoExtension.keys.todo);
	const todos = store.get();

	const control = useMemo(() => createTodoControl(store), [store]);

	return (
		<Card className="flex w-80 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
			<CardHeader className="px-4 py-3">
				<CardTitle className="text-sm">Todos</CardTitle>
			</CardHeader>

			<CardContent className="flex-1 overflow-hidden p-0">
				<ScrollArea className="h-full px-4 pb-4">
					<div className="mb-3">
						<TodoAddForm onAdd={control.addTodo} />
					</div>

					{todos.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No todos yet.
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{todos.map((todo) => (
								<TodoItem
									key={todo.id}
									todo={todo}
									onToggle={control.toggleTodo}
									onEdit={control.editTodo}
								/>
							))}
						</ul>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
