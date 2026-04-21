import { describe, expect, it } from 'vitest';

import type { Usage as PiUsage } from '@mariozechner/pi-ai';

import { fromPiUsage } from '../base/pi/translate/usage.js';

describe('fromPiUsage', () => {
	it('translates non-zero pi-ai usage into nested tokens/cost buckets', () => {
		const piUsage: PiUsage = {
			input: 120,
			output: 45,
			cacheRead: 80,
			cacheWrite: 10,
			totalTokens: 255,
			cost: {
				input: 0.00036,
				output: 0.000675,
				cacheRead: 0.00002,
				cacheWrite: 0.0000375,
				total: 0.0010925,
			},
		};

		expect(fromPiUsage(piUsage)).toEqual({
			tokens: {
				input: 120,
				output: 45,
				cacheRead: 80,
				cacheWrite: 10,
				total: 255,
			},
			cost: {
				input: 0.00036,
				output: 0.000675,
				cacheRead: 0.00002,
				cacheWrite: 0.0000375,
				total: 0.0010925,
			},
		});
	});

	it('preserves zeroes when the provider reports none', () => {
		const piUsage: PiUsage = {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};

		expect(fromPiUsage(piUsage)).toEqual({
			tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		});
	});
});
