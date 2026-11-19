import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { useGridNavigation } from '@franklin/react';
import { cn } from '../../lib/cn.js';
import { IconCell } from './cell.js';
import { filterIcons } from './filter.js';
import { toRows } from './rows.js';
import type { IconGridProps } from './types.js';

const ICON_GRID_COLUMNS = 8;

function isPlainKey(event: KeyboardEvent, key: string) {
	return (
		event.key === key &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.shiftKey
	);
}

// Grid pattern: the icons are one tab stop and arrow keys move focus between
// them in two dimensions. Search hands focus to the grid with ArrowDown or Tab,
// and ArrowUp from the top row hands it back.
// https://www.w3.org/WAI/ARIA/apg/patterns/grid/
export function IconGrid({
	icons,
	value,
	onChange,
	renderIcon,
	className,
}: IconGridProps) {
	const search = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(() =>
		Math.max(
			0,
			icons.findIndex((option) => option.id === value),
		),
	);
	const results = useMemo(() => filterIcons(icons, query), [icons, query]);
	const rows = useMemo(() => toRows(results, ICON_GRID_COLUMNS), [results]);
	const grid = useGridNavigation({
		count: results.length,
		columns: ICON_GRID_COLUMNS,
		activeIndex: active,
		onActiveIndexChange: setActive,
	});
	const index = grid.activeIndex;
	const current = results[index];

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		setQuery(event.target.value);
		setActive(0);
	}

	function pickCurrent(event: KeyboardEvent) {
		if (!current) return;
		event.preventDefault();
		onChange(current.id);
	}

	function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;
		if (event.key === 'Enter') {
			pickCurrent(event);
		} else if (event.key === 'ArrowDown' && current) {
			event.preventDefault();
			grid.focusCell(index);
		}
	}

	// Runs before the grid's own keys, which skip any key prevented here.
	function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Enter' || event.key === ' ') {
			pickCurrent(event);
		} else if (isPlainKey(event, 'ArrowUp') && index < ICON_GRID_COLUMNS) {
			event.preventDefault();
			search.current?.focus();
		}
	}

	return (
		<div className="flex min-h-0 flex-col">
			<div className="flex shrink-0 items-center border-b px-3">
				<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
				<input
					ref={search}
					role="searchbox"
					aria-label="Search icons"
					placeholder="Search icons..."
					autoComplete="off"
					spellCheck={false}
					value={query}
					onChange={handleChange}
					onKeyDown={handleSearchKeyDown}
					className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>
			<div
				{...grid.getGridProps({ onKeyDown: handleGridKeyDown })}
				aria-label="Icons"
				className={cn(
					'flex max-h-64 min-h-0 flex-col gap-0.5 overflow-y-auto p-1',
					className,
				)}
			>
				{rows.map((row, rowIndex) => (
					<div key={rowIndex} {...grid.getRowProps()} className="flex gap-0.5">
						{row.map((option, column) => {
							const cellIndex = rowIndex * ICON_GRID_COLUMNS + column;
							return (
								<IconCell
									key={option.id}
									{...grid.getCellProps(cellIndex)}
									icon={option}
									active={cellIndex === index}
									selected={option.id === value}
									renderIcon={renderIcon}
									onPick={onChange}
								/>
							);
						})}
					</div>
				))}
			</div>
			{/* TODO: Enter in search picks the active icon, but screen readers never
			    hear which one: focus stays in search and this label is hidden. Either
			    announce it (aria-live="polite") or require entering the grid to pick.
			    Deferred in review of model-picker-fields (2026-11-19). */}
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
