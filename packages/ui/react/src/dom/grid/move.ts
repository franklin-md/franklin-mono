import { gridPosition } from './position.js';
import type { GridKey, GridPosition } from './types.js';

type Move = keyof GridPosition;

// Keys follow the WAI-ARIA grid pattern:
// https://www.w3.org/WAI/ARIA/apg/patterns/grid/#keyboardinteraction-settingfocusandnavigatinginsidecells
// Left and Right continue across rows in reading order, which suits picker
// grids. Maps rather than object literals, so a key such as "constructor"
// cannot match an inherited property.
const MOVES = new Map<string, Move>([
	['ArrowLeft', 'left'],
	['ArrowRight', 'right'],
	['ArrowUp', 'up'],
	['ArrowDown', 'down'],
	['Home', 'rowStart'],
	['End', 'rowEnd'],
]);

// With Ctrl or Cmd held, Home and End reach the ends of the whole grid.
const MOVES_TO_END = new Map<string, Move>([
	['Home', 'first'],
	['End', 'last'],
]);

// Returns undefined for keys the grid leaves to the host, including modified
// arrows.
export function moveInGrid(
	index: number,
	{ key, altKey, ctrlKey, metaKey, shiftKey }: GridKey,
	count: number,
	columns: number,
): number | undefined {
	if (count === 0 || altKey || shiftKey) return undefined;
	const move = (ctrlKey || metaKey ? MOVES_TO_END : MOVES).get(key);
	return move === undefined
		? undefined
		: gridPosition(index, count, columns)[move];
}
