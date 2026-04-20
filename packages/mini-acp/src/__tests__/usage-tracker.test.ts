import { describe, expect, it, vi } from 'vitest';

import { UsageTracker, ZERO_USAGE } from '../protocol/usage-tracker.js';
import type { Usage } from '../types/usage.js';

describe('UsageTracker', () => {
	it('starts at ZERO_USAGE', () => {
		const tracker = new UsageTracker();
		expect(tracker.get()).toEqual(ZERO_USAGE);
	});

	it('add installs a single usage delta', () => {
		const tracker = new UsageTracker();
		const delta: Usage = {
			tokens: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, total: 18 },
			cost: {
				input: 0.001,
				output: 0.002,
				cacheRead: 0.0001,
				cacheWrite: 0.00005,
				total: 0.00315,
			},
		};

		tracker.add(delta);

		expect(tracker.get()).toEqual(delta);
	});

	it('add sums across every tokens and cost field', () => {
		const tracker = new UsageTracker();
		const first: Usage = {
			tokens: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, total: 18 },
			cost: {
				input: 0.001,
				output: 0.002,
				cacheRead: 0.0001,
				cacheWrite: 0.00005,
				total: 0.00315,
			},
		};
		const second: Usage = {
			tokens: { input: 3, output: 7, cacheRead: 1, cacheWrite: 0, total: 11 },
			cost: {
				input: 0.0003,
				output: 0.0014,
				cacheRead: 0.00005,
				cacheWrite: 0,
				total: 0.00175,
			},
		};

		tracker.add(first);
		tracker.add(second);

		const total = tracker.get();

		expect(total.tokens).toEqual({
			input: 13,
			output: 12,
			cacheRead: 3,
			cacheWrite: 1,
			total: 29,
		});
		// Cost fields use toBeCloseTo to tolerate IEEE754 drift.
		expect(total.cost.input).toBeCloseTo(0.0013, 10);
		expect(total.cost.output).toBeCloseTo(0.0034, 10);
		expect(total.cost.cacheRead).toBeCloseTo(0.00015, 10);
		expect(total.cost.cacheWrite).toBeCloseTo(0.00005, 10);
		expect(total.cost.total).toBeCloseTo(0.0049, 10);
	});

	it('fires onChange on each add', () => {
		const tracker = new UsageTracker();
		const listener = vi.fn();
		tracker.onChange = listener;

		tracker.add(ZERO_USAGE);
		tracker.add(ZERO_USAGE);

		expect(listener).toHaveBeenCalledTimes(2);
	});
});
