import { expect, it } from 'vitest';
import { gridPosition } from '../dom/grid/position.js';

// 20 cells in 8 columns: rows 0-7, 8-15 and a short last row 16-19.
const count = 20;
const columns = 8;

function at(index: number) {
	return gridPosition(index, count, columns);
}

it('reaches the neighbours, row ends and grid ends of a cell', () => {
	expect(at(9)).toEqual({
		left: 8,
		right: 10,
		up: 1,
		down: 17,
		rowStart: 8,
		rowEnd: 15,
		first: 0,
		last: 19,
	});
});

it('continues left and right across rows', () => {
	expect(at(8).left).toBe(7);
	expect(at(7).right).toBe(8);
});

it('stops at the grid edges', () => {
	expect(at(0).left).toBe(0);
	expect(at(3).up).toBe(3);
	expect(at(19).right).toBe(19);
	expect(at(17).down).toBe(17);
});

it('lands on the final cell when moving down into a shorter last row', () => {
	expect(at(14).down).toBe(19);
	expect(at(17).rowEnd).toBe(19);
});
