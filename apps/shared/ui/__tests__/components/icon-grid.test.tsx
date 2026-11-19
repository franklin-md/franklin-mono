// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
	const search = screen.getByRole('combobox', { name: 'Search icons' });
	return { onChange, search };
}

function activeLabel(search: HTMLElement) {
	const id = search.getAttribute('aria-activedescendant');
	return id && document.getElementById(id)?.getAttribute('aria-label');
}

it('starts on the current icon and tints the grid', () => {
	const { search } = renderGrid();
	expect(activeLabel(search)).toBe('Link');
	expect(
		screen.getByRole('option', { name: 'Link' }).getAttribute('aria-selected'),
	).toBe('true');
	expect(screen.getByRole('listbox', { name: 'Icons' }).className).toContain(
		'text-green',
	);
});

it('moves through the grid from search and picks with Enter', () => {
	const { onChange, search } = renderGrid();
	for (const [key, label] of [
		['ArrowDown', 'Star'],
		['ArrowLeft', 'Pencil'],
		['ArrowUp', 'Anchor'],
		['ArrowRight', 'Link'],
	] as const) {
		expect(fireEvent.keyDown(search, { key })).toBe(false);
		expect(activeLabel(search)).toBe(label);
		expect(scrollIntoView.mock.contexts.at(-1)).toBe(
			screen.getByRole('option', { name: label }),
		);
	}
	expect(fireEvent.keyDown(search, { key: 'Home' })).toBe(true);

	fireEvent.change(search, { target: { value: 'pen' } });
	expect(
		screen
			.getAllByRole('option')
			.map((option) => option.getAttribute('aria-label')),
	).toEqual(['Pencil']);
	fireEvent.keyDown(search, { key: 'Enter' });
	expect(onChange).toHaveBeenCalledExactlyOnceWith('pencil');
	expect(
		screen
			.getByRole('option', { name: 'Pencil' })
			.getAttribute('aria-selected'),
	).toBe('true');
});

it('picks with a click without taking focus from search', () => {
	const { onChange } = renderGrid();
	const star = screen.getByRole('option', { name: 'Star' });
	expect(fireEvent.mouseDown(star)).toBe(false);
	fireEvent.click(star);
	expect(onChange).toHaveBeenCalledExactlyOnceWith('star');
});

it('reports when no icon matches', () => {
	const { search } = renderGrid();
	fireEvent.change(search, { target: { value: 'zzz' } });
	expect(screen.getByText('No icons found')).toBeTruthy();
	expect(search.hasAttribute('aria-activedescendant')).toBe(false);
	expect(fireEvent.keyDown(search, { key: 'Enter' })).toBe(true);
});
