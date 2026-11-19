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

// jsdom has no layout. Give the virtualizer a 256px viewport, 34px rows and
// the scroll height of its sizing element, and let scrollTo move the offset it
// reads. Browsers fire scroll events asynchronously, so the stub does too.
const offsets = new WeakMap<Element, number>();
beforeEach(() => {
	vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(256);
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(34);
	vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(
		function (this: Element) {
			const content = this.firstElementChild;
			return content instanceof HTMLElement
				? Number.parseFloat(content.style.height) || 0
				: 0;
		},
	);
	vi.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(function (
		this: Element,
	) {
		return offsets.get(this) ?? 0;
	});
	Element.prototype.scrollTo = function (
		this: Element,
		options?: ScrollToOptions | number,
	) {
		if (typeof options !== 'object') return;
		offsets.set(this, options.top ?? 0);
		setTimeout(() => this.dispatchEvent(new Event('scroll')));
	} as Element['scrollTo'];
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	Reflect.deleteProperty(Element.prototype, 'scrollTo');
});

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

function renderGrid(options = icons, initial = 'link') {
	const onChange = vi.fn();
	function Harness() {
		const [value, setValue] = useState(initial);
		return (
			<IconGrid
				icons={options}
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
	const grid = screen.getByRole('grid', { name: 'Icons' });
	expect(grid.className).toContain('text-green');
	expect(grid.getAttribute('aria-rowcount')).toBe('2');
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

it('renders only rows in view and keeps the active row while scrolling', async () => {
	// 25 rows of eight; the current icon sits in the last row.
	const many = Array.from({ length: 200 }, (_, n) => ({
		id: `icon-${n}`,
		label: `Icon ${n}`,
	}));
	renderGrid(many, 'icon-199');
	const grid = screen.getByRole('grid', { name: 'Icons' });
	expect(grid.getAttribute('aria-rowcount')).toBe('25');
	// Opening scrolls to the current icon's row.
	await vi.waitFor(() =>
		expect(screen.queryByRole('gridcell', { name: 'Icon 0' })).toBe(null),
	);
	expect(tabStops()).toEqual(['Icon 199']);
	expect(screen.getAllByRole('row').length).toBeLessThan(15);

	// Ctrl+Home reaches an unrendered icon: its row scrolls in, then it focuses.
	act(() => cell('Icon 199').focus());
	fireEvent.keyDown(cell('Icon 199'), { key: 'Home', ctrlKey: true });
	await vi.waitFor(() => expect(document.activeElement).toBe(cell('Icon 0')));
	expect(tabStops()).toEqual(['Icon 0']);

	// Scrolling away by hand keeps the focused, active row rendered.
	act(() => grid.scrollTo({ top: 20 * 34 }));
	await vi.waitFor(() =>
		expect(screen.queryByRole('gridcell', { name: 'Icon 160' })).not.toBe(null),
	);
	expect(document.activeElement).toBe(cell('Icon 0'));
});
