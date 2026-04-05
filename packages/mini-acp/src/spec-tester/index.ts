export type {
	TranscriptEntry,
	Transcript,
	SpecResult,
	Expectation,
	FixtureExpectation,
	Action,
	Fixture,
	AgentFactory,
} from './types.js';

export { execute } from './execute/index.js';
export { specPoints } from './spec.js';
export { confirmSpec, type ConfirmOptions } from './confirm.js';
export { allFixtureExpectations } from './fixtures/index.js';

// Actions
export { initialize } from './actions/initialize.js';
export { setContext } from './actions/set-context.js';
export { prompt } from './actions/prompt.js';
export { cancel } from './actions/cancel.js';
export { waitFor } from './actions/wait-for.js';
// Pre-built fixtures
export { initOnly } from './fixtures/init-only.js';
export { simplePrompt } from './fixtures/simple-prompt.js';
export { toolCall } from './fixtures/tool-call.js';
