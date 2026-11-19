import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { IconCell } from './cell.js';
import { filterIcons } from './filter.js';
import { moveActive } from './move.js';
import type { IconGridProps } from './types.js';

// Combobox pattern: focus stays in the search input while arrow keys move the
// active grid cell through aria-activedescendant, as in common emoji pickers.
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
export function IconGrid({
	icons,
	value,
	onChange,
	renderIcon,
	className,
}: IconGridProps) {
	const id = useId();
	const list = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(() =>
		Math.max(
			0,
			icons.findIndex((option) => option.id === value),
		),
	);
	const results = useMemo(() => filterIcons(icons, query), [icons, query]);
	// The catalog can shrink while open; keep the active cell within the results.
	const index = Math.min(active, Math.max(results.length - 1, 0));
	const current = results[index];

	useEffect(() => {
		list.current?.children[index]?.scrollIntoView({ block: 'nearest' });
	}, [index, results]);

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		setQuery(event.target.value);
		setActive(0);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;
		if (event.key === 'Enter') {
			if (!current) return;
			event.preventDefault();
			onChange(current.id);
			return;
		}
		const next = moveActive(index, event.key, results.length);
		if (next === undefined) return;
		event.preventDefault();
		setActive(next);
	}

	return (
		<div className="flex min-h-0 flex-col">
			<div className="flex shrink-0 items-center border-b px-3">
				<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
				<input
					role="combobox"
					aria-label="Search icons"
					aria-expanded="true"
					aria-autocomplete="list"
					aria-controls={`${id}-list`}
					aria-activedescendant={current ? `${id}-${index}` : undefined}
					placeholder="Search icons..."
					autoComplete="off"
					spellCheck={false}
					value={query}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>
			<div
				ref={list}
				id={`${id}-list`}
				role="listbox"
				aria-label="Icons"
				className={cn(
					'grid max-h-64 min-h-0 grid-cols-8 content-start gap-0.5 overflow-y-auto p-1',
					className,
				)}
			>
				{results.map((option, position) => (
					<IconCell
						key={option.id}
						id={`${id}-${position}`}
						icon={option}
						active={position === index}
						selected={option.id === value}
						renderIcon={renderIcon}
						onPick={onChange}
					/>
				))}
			</div>
			{results.length ? (
				<p
					aria-hidden="true"
					className="m-0 shrink-0 truncate px-3 pb-1 text-xs text-muted-foreground"
				>
					{current?.label}
				</p>
			) : (
				<p className="m-0 py-6 text-center text-sm">No icons found</p>
			)}
		</div>
	);
}
