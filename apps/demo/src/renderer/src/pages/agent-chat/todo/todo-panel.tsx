import type { TodoExtension } from '@franklin/agent/browser';
import { useStore } from '@franklin/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { TodoItem } from './todo-item.js';

export function TodoPanel({ todoExt }: { todoExt: TodoExtension }) {
	const todos = useStore(todoExt.todos);

	return (
		<Card className="flex w-80 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
			<CardHeader className="px-4 py-3">
				<CardTitle className="text-sm">Todos</CardTitle>
			</CardHeader>

			<CardContent className="flex-1 overflow-hidden p-0">
				<ScrollArea className="h-full px-4 pb-4">
					{todos.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No todos yet.
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{todos.map((todo) => (
								<TodoItem key={todo.id} todo={todo} />
							))}
						</ul>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
