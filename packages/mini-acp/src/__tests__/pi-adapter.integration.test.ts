// ---------------------------------------------------------------------------
// Pi Adapter integration test — real LLM call via OpenRouter
//
// Requires OPENROUTER_API_KEY in env or in .env resolved from Vitest's cwd.
// Skips when no key is available.
// Uses the spec-tester fixture DSL against the real Pi agent factory so
// integration coverage exercises the same Mini-ACP client path as spec
// confirmation while still allowing scenario-specific assertions.
// ---------------------------------------------------------------------------

import { describeIfKey } from './utils/describe-if-key.js';
import { createValidLLMConfig } from './utils/llm-config.js';
import {
	itCompletesLookupCapitalToolCall,
	itCompletesSimpleTextPrompt,
} from './utils/pi-adapter-integration.js';

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describeIfKey(
	'OPENROUTER_API_KEY',
	'Pi Adapter — integration (OpenRouter, z-ai/glm-5)',
	(apiKey) => {
		const config = createValidLLMConfig(apiKey, { model: 'z-ai/glm-5' });

		itCompletesSimpleTextPrompt({
			name: 'simple text prompt returns a coherent response',
			fixtureName: 'integration-simple-text',
			config,
			systemPrompt: 'You are a helpful assistant. Be very brief.',
			promptText: 'What is 2+2? Reply with just the number.',
			expectedText: /4/,
			timeoutMs: 30_000,
		});

		itCompletesLookupCapitalToolCall({ config, timeoutMs: 60_000 });
	},
);
