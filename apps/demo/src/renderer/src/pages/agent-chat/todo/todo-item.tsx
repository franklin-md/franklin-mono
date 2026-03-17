import type { Todo } from '@franklin/agent/browser';

import { Badge } from '@/components/ui/badge';

export function TodoItem({ todo }: { todo: Todo }) {
	return (
		<li className="flex items-start gap-2 text-sm">
			<Badge
				variant={todo.completed ? 'secondary' : 'outline'}
				className="mt-0.5 h-5 w-5 shrink-0 items-center justify-center p-0 text-[10px]"
			>
				{todo.completed ? '✓' : ' '}
			</Badge>
			<span
				className={todo.completed ? 'text-muted-foreground line-through' : ''}
			>
				{todo.text}
			</span>
		</li>
	);
}
