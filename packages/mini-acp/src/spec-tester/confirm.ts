import { describe, expect, beforeAll, it } from 'vitest';

import { execute } from './execute/index.js';
import { specPoints } from './spec.js';
import { allFixtures } from './fixtures/index.js';
import type { AgentFactory, Fixture, SpecPoint, Transcript } from './types.js';

export interface ConfirmOptions {
	fixtures?: Fixture[];
	specs?: SpecPoint[];
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export function confirmSpec(
	factory: AgentFactory,
	options?: ConfirmOptions,
): void {
	const fixtures = options?.fixtures ?? allFixtures;
	const specs = options?.specs ?? specPoints;
	const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	for (const fixture of fixtures) {
		describe(fixture.name, () => {
			let transcript: Transcript;

			beforeAll(async () => {
				transcript = await execute(fixture, factory);
			}, timeoutMs);

			for (const spec of specs) {
				it(spec.description, () => {
					const result = spec.test(transcript);
					if (result === 'skip') return;
					expect(result).toBe('pass');
				});
			}
		});
	}
}
