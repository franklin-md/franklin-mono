// ---------------------------------------------------------------------------
// Pi Agent integration test — real LLM calls via OpenCode Go
//
// Requires OPENCODE_GO_API_KEY in env or in .env resolved from Vitest's cwd.
// Skips when no key is available.
// Exercises both OpenCode Go API-compatible surfaces through Mini-ACP context:
// - openai-completions via https://opencode.ai/zen/go/v1
// - anthropic-messages via https://opencode.ai/zen/go
// ---------------------------------------------------------------------------

import { describeIfKey } from './utils/describe-if-key.js';
import { createValidLLMConfig } from './utils/llm-config.js';
import { itCompletesSimpleTextPrompt } from './utils/pi-agent-integration.js';

const OPENCODE_GO_CASES = [
	{
		name: 'OpenAI-compatible endpoint',
		model: 'deepseek-v4-flash',
	},
	{
		name: 'Anthropic-compatible endpoint',
		model: 'minimax-m2.7',
	},
] as const;

describeIfKey(
	'OPENCODE_GO_API_KEY',
	'Pi Agent — integration (OpenCode Go)',
	(apiKey) => {
		for (const { name, model } of OPENCODE_GO_CASES) {
			itCompletesSimpleTextPrompt({
				name: `${name} accepts provider, model, and apiKey from Mini-ACP context`,
				fixtureName: `opencode-go-${model}`,
				config: createValidLLMConfig(apiKey, {
					provider: 'opencode-go',
					model,
				}),
				systemPrompt:
					'You are a terse integration probe. Reply exactly as requested.',
				promptText: 'Reply with exactly: pong',
				expectedText: /pong/i,
				timeoutMs: 60_000,
			});
		}
	},
);
