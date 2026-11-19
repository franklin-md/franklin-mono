import { expect, it } from 'vitest';
import { moveActive } from '../../src/components/icon-grid/move.js';

// 20 icons in 8 columns: rows 0-7, 8-15 and a short last row 16-19.
const count = 20;

it('moves by one cell horizontally and one row vertically', () => {
	expect(moveActive(9, 'ArrowLeft', count)).toBe(8);
	expect(moveActive(7, 'ArrowRight', count)).toBe(8);
	expect(moveActive(9, 'ArrowUp', count)).toBe(1);
	expect(moveActive(1, 'ArrowDown', count)).toBe(9);
});

it('stops at the grid edges', () => {
	expect(moveActive(0, 'ArrowLeft', count)).toBe(0);
	expect(moveActive(3, 'ArrowUp', count)).toBe(3);
	expect(moveActive(19, 'ArrowRight', count)).toBe(19);
	expect(moveActive(17, 'ArrowDown', count)).toBe(17);
});

it('lands on the final icon when moving down into a shorter last row', () => {
	expect(moveActive(14, 'ArrowDown', count)).toBe(19);
});

it('ignores keys the grid does not handle', () => {
	expect(moveActive(3, 'Home', count)).toBeUndefined();
	expect(moveActive(3, 'a', count)).toBeUndefined();
});
