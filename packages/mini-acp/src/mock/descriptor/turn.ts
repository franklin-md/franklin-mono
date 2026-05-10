import type { MockTurnDescriptor, TurnEndDescriptor } from './types.js';

export function turn(steps: MockTurnDescriptor): MockTurnDescriptor {
	return steps;
}

export function turnEnd(
	options: Omit<TurnEndDescriptor, 'type'> = {},
): TurnEndDescriptor {
	return { type: 'turnEnd', ...options } satisfies TurnEndDescriptor;
}

export function finishedTurn(): MockTurnDescriptor {
	return turn([turnEnd()]);
}
