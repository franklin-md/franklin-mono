import type { Expectation } from '../types.js';
import { receives } from '../assertions/filters.js';
import { StopCode } from '../../types/stop-code.js';

export function expectStopCode(expected: StopCode): Expectation {
	const name = StopCode[expected];
	return {
		id: `expect-stop-code-${expected}`,
		description: `turnEnd stopCode is ${name} (${expected})`,
		test: (t) => {
			const turnEnds = receives(t, 'turnEnd');
			if (turnEnds.length === 0) return 'fail';
			const last = turnEnds.at(-1);
			if (!last) return 'fail';
			return last.params.stopCode === expected ? 'pass' : 'fail';
		},
	};
}
