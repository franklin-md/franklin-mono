import { describeIfKey } from './utils/describe-if-key.js';
import { itContinuesAcrossLiveContextRestoreCases } from './utils/pi-agent-context-restore.js';

const OPENCODE_GO_DEEPSEEK_MODELS = ['deepseek-v4-pro'] as const;

const OPENROUTER_DEEPSEEK_MODELS = ['deepseek/deepseek-v4-pro'] as const;

const REASONING_CASES = [undefined, 'low'] as const;

describeIfKey(
	'OPENCODE_GO_API_KEY',
	'Pi Agent context restore — integration (OpenCode Go, DeepSeek)',
	(apiKey) => {
		for (const model of OPENCODE_GO_DEEPSEEK_MODELS) {
			for (const reasoning of REASONING_CASES) {
				itContinuesAcrossLiveContextRestoreCases({
					provider: 'opencode-go',
					model,
					apiKey,
					reasoning,
					timeoutMs: 120_000,
				});
			}
		}
	},
);

describeIfKey(
	'OPENROUTER_API_KEY',
	'Pi Agent context restore — integration (OpenRouter, DeepSeek)',
	(apiKey) => {
		for (const model of OPENROUTER_DEEPSEEK_MODELS) {
			for (const reasoning of REASONING_CASES) {
				itContinuesAcrossLiveContextRestoreCases({
					provider: 'openrouter',
					model,
					apiKey,
					reasoning,
					timeoutMs: 120_000,
				});
			}
		}
	},
);
