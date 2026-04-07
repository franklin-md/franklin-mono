/**
 * Curated model catalog for the model selector dropdown.
 * Hardcoded subset of popular models grouped by provider.
 */

export type AccessType = 'api' | 'sub';

export type IntelligenceTier = 'frontier' | 'strong' | 'balanced' | 'efficient';

export interface CatalogModel {
	id: string;
	provider: string;
	name: string;
	reasoning: boolean;
	contextWindow: number;
	costInput: number;
	costOutput: number;
	intelligence: IntelligenceTier;
	free?: boolean;
}

export interface ProviderGroup {
	provider: string;
	displayName: string;
	access: AccessType;
	models: CatalogModel[];
}

function model(
	provider: string,
	id: string,
	name: string,
	opts: {
		reasoning?: boolean;
		ctx: number;
		costIn: number;
		costOut: number;
		intelligence: IntelligenceTier;
		free?: boolean;
	},
): CatalogModel {
	return {
		id,
		provider,
		name,
		reasoning: opts.reasoning ?? false,
		contextWindow: opts.ctx,
		costInput: opts.costIn,
		costOutput: opts.costOut,
		intelligence: opts.intelligence,
		free: opts.free,
	};
}

export const MODEL_CATALOG: ProviderGroup[] = [
	{
		provider: 'anthropic',
		displayName: 'Anthropic',
		access: 'api',
		models: [
			model('anthropic', 'claude-opus-4-6', 'Claude Opus 4.6', {
				reasoning: true,
				ctx: 1_000_000,
				costIn: 5,
				costOut: 25,
				intelligence: 'frontier',
			}),
			model('anthropic', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', {
				reasoning: true,
				ctx: 1_000_000,
				costIn: 3,
				costOut: 15,
				intelligence: 'frontier',
			}),
			model('anthropic', 'claude-sonnet-4-5', 'Claude Sonnet 4.5', {
				reasoning: true,
				ctx: 200_000,
				costIn: 3,
				costOut: 15,
				intelligence: 'strong',
			}),
			model('anthropic', 'claude-haiku-4-5', 'Claude Haiku 4.5', {
				reasoning: true,
				ctx: 200_000,
				costIn: 1,
				costOut: 5,
				intelligence: 'balanced',
			}),
		],
	},
	{
		provider: 'openai-codex',
		displayName: 'OpenAI Codex',
		access: 'sub',
		models: [
			model('openai-codex', 'gpt-5.4', 'GPT-5.4', {
				reasoning: true,
				ctx: 272_000,
				costIn: 2.5,
				costOut: 15,
				intelligence: 'frontier',
			}),
			model('openai-codex', 'gpt-5.3-codex', 'GPT-5.3 Codex', {
				reasoning: true,
				ctx: 272_000,
				costIn: 1.75,
				costOut: 14,
				intelligence: 'strong',
			}),
			model('openai-codex', 'gpt-5.1-codex-mini', 'GPT-5.1 Codex Mini', {
				reasoning: true,
				ctx: 272_000,
				costIn: 0.25,
				costOut: 2,
				intelligence: 'balanced',
			}),
			model('openai-codex', 'gpt-5.3-codex-spark', 'GPT-5.3 Codex Spark', {
				reasoning: true,
				ctx: 128_000,
				costIn: 0,
				costOut: 0,
				intelligence: 'balanced',
				free: true,
			}),
		],
	},
	{
		provider: 'openrouter',
		displayName: 'OpenRouter',
		access: 'api',
		models: [
			model('openrouter', 'qwen/qwen3-coder:free', 'Qwen3 Coder 480B', {
				ctx: 262_000,
				costIn: 0,
				costOut: 0,
				intelligence: 'strong',
				free: true,
			}),
			model('openrouter', 'moonshotai/kimi-k2.5', 'Kimi K2.5', {
				reasoning: true,
				ctx: 262_144,
				costIn: 0.38,
				costOut: 1.72,
				intelligence: 'strong',
			}),
			model('openrouter', 'deepseek/deepseek-r1', 'DeepSeek R1', {
				reasoning: true,
				ctx: 64_000,
				costIn: 0.7,
				costOut: 2.5,
				intelligence: 'strong',
			}),
			model(
				'openrouter',
				'meta-llama/llama-3.3-70b-instruct:free',
				'Llama 3.3 70B',
				{
					ctx: 65_536,
					costIn: 0,
					costOut: 0,
					intelligence: 'balanced',
					free: true,
				},
			),
			model(
				'openrouter',
				'qwen/qwen3-next-80b-a3b-instruct:free',
				'Qwen3 Next 80B',
				{
					ctx: 262_000,
					costIn: 0,
					costOut: 0,
					intelligence: 'balanced',
					free: true,
				},
			),
		],
	},
];
