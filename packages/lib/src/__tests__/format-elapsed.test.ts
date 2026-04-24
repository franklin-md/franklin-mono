import { describe, expect, it } from 'vitest';

import { formatElapsed } from '../utils/format-elapsed.js';

describe('formatElapsed', () => {
	it('formats sub-minute durations as seconds only', () => {
		expect(formatElapsed(0)).toBe('0s');
		expect(formatElapsed(5_000)).toBe('5s');
		expect(formatElapsed(59_000)).toBe('59s');
	});

	it('switches to minutes once a minute has elapsed', () => {
		expect(formatElapsed(60_000)).toBe('1m 0s');
		expect(formatElapsed(83_000)).toBe('1m 23s');
		expect(formatElapsed(59 * 60_000 + 59_000)).toBe('59m 59s');
	});

	it('switches to hours once an hour has elapsed', () => {
		expect(formatElapsed(3_600_000)).toBe('1h 0m 0s');
		expect(formatElapsed(3_600_000 + 2 * 60_000 + 34_000)).toBe('1h 2m 34s');
	});

	it('floors sub-second remainders', () => {
		expect(formatElapsed(5_999)).toBe('5s');
	});

	it('clamps negative input to zero', () => {
		expect(formatElapsed(-1_000)).toBe('0s');
	});
});
