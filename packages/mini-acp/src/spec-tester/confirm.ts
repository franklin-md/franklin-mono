import { describe, expect, beforeAll, it } from 'vitest';

import { execute } from './execute/index.js';
import { specPoints } from './spec.js';
import { allFixtureExpectations } from './fixtures/index.js';
import type {
	AgentFactory,
	Expectation,
	FixtureExpectation,
	Transcript,
} from './types.js';

export interface ConfirmOptions {
	entries?: FixtureExpectation[];
	specs?: Expectation[];
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export function confirmSpec(
	factory: AgentFactory,
	options?: ConfirmOptions,
): void {
	const entries = options?.entries ?? allFixtureExpectations;
	const specs = options?.specs ?? specPoints;
	const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	for (const { fixture, expectations } of entries) {
		describe(fixture.name, () => {
			let transcript: Transcript;

			beforeAll(async () => {
				transcript = await execute(fixture, factory);
			}, timeoutMs);

			// Protocol invariant spec points
			for (const spec of specs) {
				it(spec.description, () => {
					const result = spec.test(transcript);
					if (result === 'skip') return;
					expect(result).toBe('pass');
				});
			}

			// Fixture-specific expectations
			for (const expectation of expectations) {
				it(expectation.description, () => {
					const result = expectation.test(transcript);
					if (result === 'skip') return;
					expect(result).toBe('pass');
				});
			}
		});
	}
}
