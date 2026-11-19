import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { Range } from '@tanstack/react-virtual';
import { useGridNavigation } from '@franklin/react';
import { cn } from '../../lib/cn.js';
import { IconCell } from './cell.js';
import { filterIcons } from './filter.js';
import { toRows } from './rows.js';
import type { IconGridProps } from './types.js';

const ICON_GRID_COLUMNS = 8;

// Row geometry in rem, matching the size-8 cells and the gap-0.5 and pb-0.5
// spacing on each row.
const CELL_REM = 2;
const GAP_REM = 0.125;

// Absolutely positioned rows give the grid no intrinsic width, so size it from
// the same geometry.
const ROW_WIDTH = `${ICON_GRID_COLUMNS * CELL_REM + (ICON_GRID_COLUMNS - 1) * GAP_REM}rem`;

// The virtualizer measures each rendered row, so this pixel estimate (at a 16px
// root) only sizes rows not rendered yet. If it is off, for example under
// another root font size, rows still land in place: TanStack Virtual corrects
// offsets as rows are measured and retargets scrollToIndex. Only the
// scrollbar resizes while unmeasured rows scroll in.
const ROW_ESTIMATE = (CELL_REM + GAP_REM) * 16;
const estimateRowSize = () => ROW_ESTIMATE;

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
//
// Hosts such as Obsidian list ~2,000 icons, and drawing each one costs DOM
// work. Only rows in view render, using TanStack Virtual:
// https://tanstack.com/virtual/latest/docs/framework/react/react-virtual
// The grid keeps a fixed height, so a surrounding popover keeps its size (and
// its side) while search narrows the results.
export function IconGrid({
	icons,
	value,
	onChange,
	renderIcon,
	className,
}: IconGridProps) {
	const search = useRef<HTMLInputElement>(null);
	const scroller = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(() =>
		Math.max(
			0,
			icons.findIndex((option) => option.id === value),
		),
	);
	const results = useMemo(() => filterIcons(icons, query), [icons, query]);
	const rows = useMemo(() => toRows(results, ICON_GRID_COLUMNS), [results]);
	const activeRow = Math.floor(
		Math.min(active, Math.max(results.length - 1, 0)) / ICON_GRID_COLUMNS,
	);
	// The active row holds the grid's tab stop and, while navigating, focus.
	// Keep it rendered so scrolling it away does not drop focus to the page.
	const rangeExtractor = useCallback(
		(range: Range) => {
			const indexes = defaultRangeExtractor(range);
			if (activeRow >= rows.length || indexes.includes(activeRow))
				return indexes;
			return [...indexes, activeRow].sort((a, b) => a - b);
		},
		[activeRow, rows.length],
	);
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scroller.current,
		estimateSize: estimateRowSize,
		paddingStart: 4,
		paddingEnd: 2,
		overscan: 2,
		rangeExtractor,
	});
	const grid = useGridNavigation({
		count: results.length,
		columns: ICON_GRID_COLUMNS,
		activeIndex: active,
		onActiveIndexChange: setActive,
		ref: scroller,
		// The virtualizer counts rows, not cells.
		scrollToIndex: (cell) =>
			virtualizer.scrollToIndex(Math.floor(cell / ICON_GRID_COLUMNS)),
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
			{results.length ? (
				<div
					{...grid.getGridProps({ onKeyDown: handleGridKeyDown })}
					aria-label="Icons"
					className={cn('h-64 min-h-0 overflow-y-auto px-1', className)}
				>
					{/* Inline geometry is the virtualizer's runtime layout. */}
					<div
						className="relative"
						style={{ width: ROW_WIDTH, height: virtualizer.getTotalSize() }}
					>
						{virtualizer.getVirtualItems().map((item) => (
							<div
								key={item.key}
								// measureElement reads the row from data-index.
								ref={virtualizer.measureElement}
								data-index={item.index}
								{...grid.getRowProps(item.index)}
								className="absolute left-0 top-0 flex gap-0.5 pb-0.5"
								style={{ transform: `translateY(${item.start}px)` }}
							>
								{rows[item.index]?.map((option, column) => {
									const cellIndex = item.index * ICON_GRID_COLUMNS + column;
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
				</div>
			) : (
				<p className="m-0 flex h-64 min-h-0 items-center justify-center text-sm">
					No icons found
				</p>
			)}
			{/* TODO: Enter in search picks the active icon, but screen readers never
			    hear which one: focus stays in search and this label is hidden. Either
			    announce it (aria-live="polite") or require entering the grid to pick.
			    Deferred in review of model-picker-fields (2026-11-19). */}
			<p
				aria-hidden="true"
				className="m-0 h-5 shrink-0 truncate px-3 pb-1 text-xs text-muted-foreground"
			>
				{current?.label}
			</p>
		</div>
	);
}
