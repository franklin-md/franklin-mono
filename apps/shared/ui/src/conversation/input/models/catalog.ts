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

const ANTHROPIC_PROVIDER_GROUP: ProviderGroup = {
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
};

const OPENAI_CODEX_PROVIDER_GROUP: ProviderGroup = {
	provider: 'openai-codex',
	displayName: 'OpenAI Codex',
	access: 'sub',
	models: [
		model('openai-codex', 'gpt-5.5', 'GPT-5.5', {
			reasoning: true,
			ctx: 1_050_000,
			costIn: 5,
			costOut: 30,
			intelligence: 'frontier',
		}),
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
};

const OPENROUTER_PROVIDER_GROUP: ProviderGroup = {
	provider: 'openrouter',
	displayName: 'OpenRouter',
	access: 'api',
	models: [
		model('openrouter', 'z-ai/glm-5.1', 'GLM 5.1', {
			reasoning: true,
			ctx: 202_752,
			costIn: 1.26,
			costOut: 3.96,
			intelligence: 'frontier',
		}),
		model('openrouter', 'qwen/qwen3.6-plus', 'Qwen3.6 Plus', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 0.325,
			costOut: 1.95,
			intelligence: 'frontier',
		}),
		model('openrouter', 'deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 0.14,
			costOut: 0.28,
			intelligence: 'strong',
		}),
		model('openrouter', 'deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 1.74,
			costOut: 3.48,
			intelligence: 'frontier',
		}),
		model('openrouter', 'x-ai/grok-4.20', 'Grok 4.20', {
			reasoning: true,
			ctx: 2_000_000,
			costIn: 2,
			costOut: 6,
			intelligence: 'frontier',
		}),
		model(
			'openrouter',
			'google/gemini-3-flash-preview',
			'Gemini 3 Flash Preview',
			{
				reasoning: true,
				ctx: 1_048_576,
				costIn: 0.5,
				costOut: 3,
				intelligence: 'strong',
			},
		),
		model(
			'openrouter',
			'google/gemini-3.1-flash-lite-preview',
			'Gemini 3.1 Flash Lite Preview',
			{
				reasoning: true,
				ctx: 1_048_576,
				costIn: 0.25,
				costOut: 1.5,
				intelligence: 'efficient',
			},
		),
		model(
			'openrouter',
			'google/gemini-3.1-pro-preview-customtools',
			'Gemini 3.1 Pro Preview Custom Tools',
			{
				reasoning: true,
				ctx: 1_048_576,
				costIn: 2,
				costOut: 12,
				intelligence: 'frontier',
			},
		),
		model('openrouter', 'xiaomi/mimo-v2.5-pro', 'MiMo-V2.5-Pro', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 1,
			costOut: 3,
			intelligence: 'frontier',
		}),
		model('openrouter', 'minimax/minimax-m2.7', 'MiniMax M2.7', {
			reasoning: true,
			ctx: 204_800,
			costIn: 0.3,
			costOut: 1.2,
			intelligence: 'strong',
		}),
		model('openrouter', 'moonshotai/kimi-k2.6', 'Kimi K2.6', {
			reasoning: true,
			ctx: 256_000,
			costIn: 0.7448,
			costOut: 4.655,
			intelligence: 'strong',
		}),
	],
};

const PROVIDER_GROUPS = {
	anthropic: ANTHROPIC_PROVIDER_GROUP,
	openaiCodex: OPENAI_CODEX_PROVIDER_GROUP,
	openrouter: OPENROUTER_PROVIDER_GROUP,
};

export const MODEL_CATALOG: ProviderGroup[] = [
	PROVIDER_GROUPS.openaiCodex,
	PROVIDER_GROUPS.openrouter,
];
