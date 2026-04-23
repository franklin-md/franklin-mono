import { describe, expect, it } from 'vitest';
import { renderCurrentDate } from '../render-date.js';

describe('renderCurrentDate', () => {
	it('formats the date as an ISO calendar day', () => {
		const d = new Date('2026-04-21T14:23:00Z');
		expect(renderCurrentDate(d)).toBe("Today's date: 2026-04-21");
	});

	it('pads single-digit months and days', () => {
		const d = new Date('2026-01-05T00:00:00Z');
		expect(renderCurrentDate(d)).toBe("Today's date: 2026-01-05");
	});
});
