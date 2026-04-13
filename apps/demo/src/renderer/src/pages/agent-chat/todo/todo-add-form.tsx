import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button, Input } from '@franklin/ui';

export function TodoAddForm({ onAdd }: { onAdd: (text: string) => void }) {
	const [text, setText] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	function submit() {
		const trimmed = text.trim();
		if (!trimmed) return;
		onAdd(trimmed);
		setText('');
		inputRef.current?.focus();
	}

	return (
		<form
			className="flex gap-1.5"
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<Input
				ref={inputRef}
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Add a todo…"
				className="h-7 text-xs"
			/>
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0"
				disabled={!text.trim()}
			>
				<Plus className="h-4 w-4" />
			</Button>
		</form>
	);
}
