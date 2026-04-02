// ---------------------------------------------------------------------------
// Spec Tester — suite runner
//
// Runs each fixture, evaluates every spec point against the transcript,
// returns the coverage matrix.
// ---------------------------------------------------------------------------

import { execute } from './execute/index.js';
import type {
	Fixture,
	SpecPoint,
	AgentFactory,
	SuiteResult,
	FixtureResult,
} from './types.js';

export async function runSuite(
	fixtures: Fixture[],
	specs: SpecPoint[],
	factory: AgentFactory,
): Promise<SuiteResult> {
	const results: FixtureResult[] = [];

	for (const fixture of fixtures) {
		const transcript = await execute(fixture, factory);
		const specResults = specs.map((spec) => ({
			specId: spec.id,
			result: spec.test(transcript),
		}));
		results.push({
			fixture: fixture.name,
			transcript,
			specs: specResults,
		});
	}

	return { fixtures: results };
}
