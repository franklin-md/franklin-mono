import { expect, it } from 'vitest';
import { moveInGrid } from '../dom/grid/move.js';
import type { GridKey } from '../dom/grid/types.js';

// 20 cells in 8 columns, moving from cell 11 in the middle row (8-15).
const count = 20;
const columns = 8;

function key(name: string, modifiers: Partial<GridKey> = {}): GridKey {
	return {
		key: name,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...modifiers,
	};
}

function press(name: string, modifiers?: Partial<GridKey>) {
	return moveInGrid(11, key(name, modifiers), count, columns);
}

it('moves one cell with the arrow keys', () => {
	expect(press('ArrowLeft')).toBe(10);
	expect(press('ArrowRight')).toBe(12);
	expect(press('ArrowUp')).toBe(3);
	expect(press('ArrowDown')).toBe(19);
});

it('moves to the row ends with Home and End, and the grid ends with Ctrl or Cmd', () => {
	expect(press('Home')).toBe(8);
	expect(press('End')).toBe(15);
	expect(press('Home', { ctrlKey: true })).toBe(0);
	expect(press('End', { metaKey: true })).toBe(19);
});

it('leaves other keys and modified arrows to the host', () => {
	expect(press('a')).toBeUndefined();
	expect(press('constructor')).toBeUndefined();
	expect(press('ArrowDown', { shiftKey: true })).toBeUndefined();
	expect(press('ArrowLeft', { altKey: true })).toBeUndefined();
	expect(press('ArrowRight', { metaKey: true })).toBeUndefined();
	expect(moveInGrid(0, key('ArrowDown'), 0, columns)).toBeUndefined();
});
