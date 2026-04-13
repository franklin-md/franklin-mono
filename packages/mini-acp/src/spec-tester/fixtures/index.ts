import type { Fixture, FixtureExpectation, Expectation } from '../types.js';
import { StopCode } from '../../types/stop-code.js';
import { expectStopCode } from '../expectations/stop-code.js';
import { expectProtocolError } from '../expectations/protocol-error.js';

import { initOnly } from './init-only.js';
import { overlappingPrompts } from './overlapping-prompts.js';
import { simplePrompt } from './simple-prompt.js';
import { reasoningPrompt } from './reasoning-prompt.js';
import { toolCall } from './tool-call.js';
import { missingProvider } from './missing-provider.js';
import { unknownProvider } from './unknown-provider.js';
import { missingModel } from './missing-model.js';
import { unknownModel } from './unknown-model.js';
import { missingAuthKey } from './missing-auth-key.js';
import { invalidAuthKey } from './invalid-auth-key.js';

function fe(
	fixture: Fixture,
	...expectations: Expectation[]
): FixtureExpectation {
	return { fixture, expectations };
}

export const allFixtureExpectations: FixtureExpectation[] = [
	fe(initOnly),
	fe(simplePrompt),
	fe(reasoningPrompt),
	fe(
		overlappingPrompts,
		expectProtocolError('prompt', /already in progress/i),
		expectStopCode(StopCode.Cancelled),
	),
	fe(toolCall),
	fe(missingProvider, expectStopCode(StopCode.ProviderNotSpecified)),
	fe(unknownProvider, expectStopCode(StopCode.ProviderNotFound)),
	fe(missingModel, expectStopCode(StopCode.ModelNotSpecified)),
	fe(unknownModel, expectStopCode(StopCode.ModelNotFound)),
	fe(missingAuthKey, expectStopCode(StopCode.AuthKeyNotSpecified)),
	fe(invalidAuthKey, expectStopCode(StopCode.AuthKeyInvalid)),
];
