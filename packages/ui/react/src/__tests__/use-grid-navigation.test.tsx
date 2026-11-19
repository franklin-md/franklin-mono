import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { createRef, useState } from 'react';
import type { FocusEventHandler, KeyboardEventHandler, Ref } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useGridNavigation } from '../dom/grid/use-grid-navigation.js';

// jsdom does not implement scrollIntoView.
const scrollIntoView = vi.fn();
HTMLElement.prototype.scrollIntoView = scrollIntoView;

beforeEach(() => scrollIntoView.mockClear());
afterEach(cleanup);

// Five cells in rows of two: A B / C D / E.
const labels = ['A', 'B', 'C', 'D', 'E'];
const columns = 2;

type Props = {
	initial?: number;
	onActiveIndexChange?: (index: number) => void;
	onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
	onFocus?: FocusEventHandler<HTMLDivElement>;
	gridRef?: Ref<HTMLDivElement>;
};

function Grid({
	initial = 1,
	onActiveIndexChange,
	onKeyDown,
	onFocus,
	gridRef,
}: Props) {
	const [active, setActive] = useState(initial);
	const grid = useGridNavigation({
		count: labels.length,
		columns,
		activeIndex: active,
		onActiveIndexChange: (index) => {
			setActive(index);
			onActiveIndexChange?.(index);
		},
		ref: gridRef,
	});
	const rows = [labels.slice(0, 2), labels.slice(2, 4), labels.slice(4)];
	return (
		<div {...grid.getGridProps({ onKeyDown, onFocus })} aria-label="Letters">
			{rows.map((row, r) => (
				<div key={r} {...grid.getRowProps()}>
					{row.map((label, c) => (
						<div key={label} {...grid.getCellProps(r * columns + c)}>
							{label}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

function cell(name: string) {
	return screen.getByRole('gridcell', { name });
}

function tabStops() {
	return screen
		.getAllByRole('gridcell')
		.filter((element) => element.tabIndex === 0)
		.map((element) => element.textContent);
}

it('is a single tab stop on the active cell, scrolled into view', () => {
	render(<Grid />);
	expect(screen.getByRole('grid', { name: 'Letters' })).toBeTruthy();
	expect(tabStops()).toEqual(['B']);
	expect(scrollIntoView.mock.contexts.at(-1)).toBe(cell('B'));
});

it('clamps an active index past the last cell', () => {
	render(<Grid initial={9} />);
	expect(tabStops()).toEqual(['E']);
	expect(scrollIntoView.mock.contexts.at(-1)).toBe(cell('E'));
});

it('moves focus and the tab stop with arrow keys, Home and End', () => {
	render(<Grid />);
	act(() => cell('B').focus());
	let from = 'B';
	for (const [key, label, modifiers] of [
		['ArrowDown', 'D', {}],
		['ArrowDown', 'E', {}],
		['ArrowUp', 'C', {}],
		['ArrowRight', 'D', {}],
		['Home', 'C', {}],
		['End', 'E', { ctrlKey: true }],
		['Home', 'A', { metaKey: true }],
	] as const) {
		expect(fireEvent.keyDown(cell(from), { key, ...modifiers })).toBe(false);
		expect(document.activeElement).toBe(cell(label));
		expect(cell(label).tabIndex).toBe(0);
		from = label;
	}
	expect(fireEvent.keyDown(cell('A'), { key: 'Enter' })).toBe(true);
});

it('makes a cell focused by pointer the active cell', () => {
	render(<Grid />);
	act(() => cell('E').focus());
	expect(cell('E').tabIndex).toBe(0);
	expect(cell('B').tabIndex).toBe(-1);
});

it('reports each move once', () => {
	const onActiveIndexChange = vi.fn();
	render(<Grid onActiveIndexChange={onActiveIndexChange} />);
	act(() => cell('B').focus());
	fireEvent.keyDown(cell('B'), { key: 'ArrowDown' });
	expect(onActiveIndexChange.mock.calls).toEqual([[3]]);
});

it("runs the caller's handlers first and skips keys the caller prevents", () => {
	const onFocus = vi.fn();
	const gridRef = createRef<HTMLDivElement>();
	render(
		<Grid
			gridRef={gridRef}
			onFocus={onFocus}
			onKeyDown={(event) => {
				if (event.key === 'ArrowDown') event.preventDefault();
			}}
		/>,
	);
	expect(gridRef.current).toBe(screen.getByRole('grid'));
	act(() => cell('B').focus());
	expect(onFocus).toHaveBeenCalledOnce();
	fireEvent.keyDown(cell('B'), { key: 'ArrowDown' });
	expect(document.activeElement).toBe(cell('B'));
	fireEvent.keyDown(cell('B'), { key: 'ArrowLeft' });
	expect(document.activeElement).toBe(cell('A'));
});
