// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IconGrid } from '../../src/components/icon-grid/index.js';
import type { IconRenderer } from '../../src/components/icon-grid/types.js';

// jsdom does not implement scrollIntoView.
const scrollIntoView = vi.fn();
HTMLElement.prototype.scrollIntoView = scrollIntoView;

beforeEach(() => scrollIntoView.mockClear());
afterEach(cleanup);

// Ten icons fill one 8-column row and two cells of the next.
const icons = [
	'Anchor',
	'Link',
	'Book',
	'Brain',
	'Bug',
	'Cake',
	'Camera',
	'Car',
	'Pencil',
	'Star',
].map((label) => ({ id: label.toLowerCase(), label }));

const Glyph: IconRenderer = ({ className }) => (
	<svg aria-hidden="true" className={className} />
);

function renderGrid() {
	const onChange = vi.fn();
	function Harness() {
		const [value, setValue] = useState('link');
		return (
			<IconGrid
				icons={icons}
				value={value}
				renderIcon={Glyph}
				className="text-green"
				onChange={(id) => {
					setValue(id);
					onChange(id);
				}}
			/>
		);
	}
	render(<Harness />);
	const search = screen.getByRole('searchbox', { name: 'Search icons' });
	return { onChange, search };
}

function cell(name: string) {
	return screen.getByRole('gridcell', { name });
}

function tabStops() {
	return screen
		.getAllByRole('gridcell')
		.filter((element) => element.tabIndex === 0)
		.map((element) => element.getAttribute('aria-label'));
}

it('starts on the current icon, in rows of eight, and tints the grid', () => {
	renderGrid();
	expect(tabStops()).toEqual(['Link']);
	expect(cell('Link').getAttribute('aria-selected')).toBe('true');
	expect(scrollIntoView.mock.contexts.at(-1)).toBe(cell('Link'));
	const grid = screen.getByRole('grid', { name: 'Icons' });
	expect(grid.className).toContain('text-green');
	expect(screen.getAllByRole('row').map((row) => row.children.length)).toEqual([
		8, 2,
	]);
});

it('enters the grid from search, moves in two dimensions and picks with Enter', () => {
	const { onChange, search } = renderGrid();
	act(() => search.focus());
	expect(fireEvent.keyDown(search, { key: 'ArrowDown' })).toBe(false);
	expect(document.activeElement).toBe(cell('Link'));
	let from = 'Link';
	for (const [key, label] of [
		['ArrowDown', 'Star'],
		['ArrowLeft', 'Pencil'],
		['ArrowUp', 'Anchor'],
		['End', 'Car'],
	] as const) {
		expect(fireEvent.keyDown(cell(from), { key })).toBe(false);
		expect(document.activeElement).toBe(cell(label));
		expect(tabStops()).toEqual([label]);
		from = label;
	}
	fireEvent.keyDown(cell('Car'), { key: 'Enter' });
	expect(onChange).toHaveBeenCalledExactlyOnceWith('car');
	expect(cell('Car').getAttribute('aria-selected')).toBe('true');
});

it('returns to search with ArrowUp from the top row', () => {
	const { search } = renderGrid();
	act(() => cell('Link').focus());
	expect(
		fireEvent.keyDown(cell('Link'), { key: 'ArrowUp', shiftKey: true }),
	).toBe(true);
	expect(document.activeElement).toBe(cell('Link'));
	expect(fireEvent.keyDown(cell('Link'), { key: 'ArrowUp' })).toBe(false);
	expect(document.activeElement).toBe(search);
});

it('picks the first result with Enter from search', () => {
	const { onChange, search } = renderGrid();
	fireEvent.change(search, { target: { value: 'pen' } });
	expect(
		screen
			.getAllByRole('gridcell')
			.map((element) => element.getAttribute('aria-label')),
	).toEqual(['Pencil']);
	expect(tabStops()).toEqual(['Pencil']);
	fireEvent.keyDown(search, { key: 'Enter' });
	expect(onChange).toHaveBeenCalledExactlyOnceWith('pencil');
});

it('picks with a click or Space', () => {
	const { onChange } = renderGrid();
	fireEvent.click(cell('Star'));
	expect(onChange).toHaveBeenLastCalledWith('star');
	act(() => cell('Bug').focus());
	fireEvent.keyDown(cell('Bug'), { key: ' ' });
	expect(onChange).toHaveBeenLastCalledWith('bug');
});

it('reports when no icon matches', () => {
	const { search } = renderGrid();
	fireEvent.change(search, { target: { value: 'zzz' } });
	expect(screen.getByText('No icons found')).toBeTruthy();
	expect(screen.queryAllByRole('gridcell')).toEqual([]);
	expect(fireEvent.keyDown(search, { key: 'Enter' })).toBe(true);
	expect(fireEvent.keyDown(search, { key: 'ArrowDown' })).toBe(true);
});
