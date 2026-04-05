import { bindPiAgent } from '../base/pi/agent.js';
import { confirmSpec } from '../spec-tester/confirm.js';
import { allFixtureExpectations } from '../spec-tester/fixtures/index.js';
import { describeIfKey } from './utils/describe-if-key.js';
import { createValidLLMConfig, withLLMConfig } from './utils/llm-config.js';

describeIfKey(
	'OPENROUTER_API_KEY',
	'pi-adapter spec confirmation',
	(apiKey) => {
		const entries = withLLMConfig(
			allFixtureExpectations,
			createValidLLMConfig(apiKey),
		);
		confirmSpec(bindPiAgent, { entries, timeoutMs: 60_000 });
	},
);
