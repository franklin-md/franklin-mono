import { bindPiAgent } from '../base/pi/agent.js';
import { confirmSpec } from '../spec-tester/confirm.js';
import { allFixtures } from '../spec-tester/fixtures/index.js';
import { describeIfKey } from './utils/describe-if-key.js';
import { createValidLLMConfig, withLLMConfig } from './utils/llm-config.js';

describeIfKey(
	'OPENROUTER_API_KEY',
	'pi-adapter spec confirmation',
	(apiKey) => {
		const fixtures = withLLMConfig(allFixtures, createValidLLMConfig(apiKey));
		confirmSpec(bindPiAgent, { fixtures, timeoutMs: 60_000 });
	},
);
