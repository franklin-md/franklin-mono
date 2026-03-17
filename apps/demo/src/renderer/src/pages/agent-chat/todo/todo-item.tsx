import type { Todo } from '@franklin/agent/browser';
import { Check, Pencil, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TodoItem({
	todo,
	onToggle,
	onEdit,
}: {
	todo: Todo;
	onToggle: (id: string) => void;
	onEdit: (id: string, text: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(todo.text);
	const inputRef = useRef<HTMLInputElement>(null);

	function startEditing() {
		setDraft(todo.text);
		setEditing(true);
		// Focus after React renders the input
		requestAnimationFrame(() => inputRef.current?.focus());
	}

	function commitEdit() {
		const trimmed = draft.trim();
		if (trimmed && trimmed !== todo.text) {
			onEdit(todo.id, trimmed);
		}
		setEditing(false);
	}

	function cancelEdit() {
		setDraft(todo.text);
		setEditing(false);
	}

	if (editing) {
		return (
			<li className="flex items-center gap-1">
				<Input
					ref={inputRef}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') commitEdit();
						if (e.key === 'Escape') cancelEdit();
					}}
					className="h-6 flex-1 text-xs"
				/>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0"
					onClick={commitEdit}
				>
					<Check className="h-3 w-3" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0"
					onClick={cancelEdit}
				>
					<X className="h-3 w-3" />
				</Button>
			</li>
		);
	}

	return (
		<li className="group flex items-start gap-2 text-sm">
			<Badge
				variant={todo.completed ? 'secondary' : 'outline'}
				className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer items-center justify-center p-0 text-[10px] hover:bg-accent"
				onClick={() => onToggle(todo.id)}
			>
				{todo.completed ? '✓' : ' '}
			</Badge>
			<span
				className={`flex-1 ${todo.completed ? 'text-muted-foreground line-through' : ''}`}
				onDoubleClick={startEditing}
			>
				{todo.text}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
				onClick={startEditing}
			>
				<Pencil className="h-3 w-3" />
			</Button>
		</li>
	);
}
