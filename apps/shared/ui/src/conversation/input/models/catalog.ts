/**
 * Curated model catalog for the model selector dropdown.
 * Hardcoded subset of popular models grouped by provider.
 */

export type AccessType = 'api' | 'sub';

export interface CatalogModel {
	id: string;
	provider: string;
	name: string;
	reasoning: boolean;
	contextWindow: number;
	costInput: number;
	costOutput: number;
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
		}),
		model('anthropic', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 3,
			costOut: 15,
		}),
		model('anthropic', 'claude-sonnet-4-5', 'Claude Sonnet 4.5', {
			reasoning: true,
			ctx: 200_000,
			costIn: 3,
			costOut: 15,
		}),
		model('anthropic', 'claude-haiku-4-5', 'Claude Haiku 4.5', {
			reasoning: true,
			ctx: 200_000,
			costIn: 1,
			costOut: 5,
		}),
	],
};

const OPENAI_CODEX_PROVIDER_GROUP: ProviderGroup = {
	provider: 'openai-codex',
	displayName: 'OpenAI Codex',
	access: 'sub',
	models: [
		model('openai-codex', 'gpt-5.6-sol', 'GPT-5.6 Sol', {
			reasoning: true,
			ctx: 372_000,
			costIn: 5,
			costOut: 30,
		}),
		model('openai-codex', 'gpt-5.6-terra', 'GPT-5.6 Terra', {
			reasoning: true,
			ctx: 372_000,
			costIn: 2.5,
			costOut: 15,
		}),
		model('openai-codex', 'gpt-5.5', 'GPT-5.5', {
			reasoning: true,
			ctx: 272_000,
			costIn: 5,
			costOut: 30,
		}),
		model('openai-codex', 'gpt-5.4', 'GPT-5.4', {
			reasoning: true,
			ctx: 272_000,
			costIn: 2.5,
			costOut: 15,
		}),
		model('openai-codex', 'gpt-5.4-mini', 'GPT-5.4 Mini', {
			reasoning: true,
			ctx: 272_000,
			costIn: 0.75,
			costOut: 4.5,
		}),
	],
};

const OPENCODE_GO_PROVIDER_GROUP: ProviderGroup = {
	provider: 'opencode-go',
	displayName: 'OpenCode Go',
	access: 'api',
	models: [
		model('opencode-go', 'deepseek-v4-pro', 'DeepSeek V4 Pro', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 1.74,
			costOut: 3.48,
		}),
		model('opencode-go', 'deepseek-v4-flash', 'DeepSeek V4 Flash', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 0.14,
			costOut: 0.28,
		}),
		model('opencode-go', 'mimo-v2.5-pro', 'MiMo V2.5 Pro', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 1,
			costOut: 3,
		}),
		model('opencode-go', 'mimo-v2.5', 'MiMo V2.5', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 0.4,
			costOut: 2,
		}),
		model('opencode-go', 'kimi-k2.6', 'Kimi K2.6', {
			reasoning: true,
			ctx: 262_144,
			costIn: 0.95,
			costOut: 4,
		}),
		model('opencode-go', 'glm-5.1', 'GLM-5.1', {
			reasoning: true,
			ctx: 202_752,
			costIn: 1.4,
			costOut: 4.4,
		}),
		model('opencode-go', 'qwen3.6-plus', 'Qwen3.6 Plus', {
			reasoning: true,
			ctx: 262_144,
			costIn: 0.5,
			costOut: 3,
		}),
		model('opencode-go', 'qwen3.5-plus', 'Qwen3.5 Plus', {
			reasoning: true,
			ctx: 262_144,
			costIn: 0.2,
			costOut: 1.2,
		}),
		model('opencode-go', 'minimax-m2.7', 'MiniMax M2.7', {
			reasoning: true,
			ctx: 204_800,
			costIn: 0.3,
			costOut: 1.2,
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
		}),
		model('openrouter', 'qwen/qwen3.6-plus', 'Qwen3.6 Plus', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 0.325,
			costOut: 1.95,
		}),
		model('openrouter', 'qwen/qwen3.7-max', 'Qwen3.7 Max', {
			reasoning: true,
			ctx: 1_000_000,
			costIn: 2.5,
			costOut: 7.5,
		}),
		model('openrouter', 'deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 0.14,
			costOut: 0.28,
		}),
		model('openrouter', 'deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 0.435,
			costOut: 0.87,
		}),
		model('openrouter', 'x-ai/grok-4.5', 'Grok 4.5', {
			reasoning: true,
			ctx: 500_000,
			costIn: 2,
			costOut: 6,
		}),
		model('openrouter', 'x-ai/grok-4.20', 'Grok 4.20', {
			reasoning: true,
			ctx: 2_000_000,
			costIn: 2,
			costOut: 6,
		}),
		model('openrouter', 'google/gemini-3.5-flash', 'Gemini 3.5 Flash', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 1.5,
			costOut: 9,
		}),
		model(
			'openrouter',
			'google/gemini-3.1-flash-lite-preview',
			'Gemini 3.1 Flash Lite Preview',
			{
				reasoning: true,
				ctx: 1_048_576,
				costIn: 0.25,
				costOut: 1.5,
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
			},
		),
		model('openrouter', 'xiaomi/mimo-v2.5-pro', 'MiMo-V2.5-Pro', {
			reasoning: true,
			ctx: 1_048_576,
			costIn: 1,
			costOut: 3,
		}),
		model('openrouter', 'minimax/minimax-m2.7', 'MiniMax M2.7', {
			reasoning: true,
			ctx: 204_800,
			costIn: 0.3,
			costOut: 1.2,
		}),
		model('openrouter', 'moonshotai/kimi-k2.6', 'Kimi K2.6', {
			reasoning: true,
			ctx: 262_144,
			costIn: 0.75,
			costOut: 3.5,
		}),
	],
};

const PROVIDER_GROUPS = {
	anthropic: ANTHROPIC_PROVIDER_GROUP,
	openaiCodex: OPENAI_CODEX_PROVIDER_GROUP,
	opencodeGo: OPENCODE_GO_PROVIDER_GROUP,
	openrouter: OPENROUTER_PROVIDER_GROUP,
};

export const MODEL_CATALOG: ProviderGroup[] = [
	PROVIDER_GROUPS.openaiCodex,
	PROVIDER_GROUPS.opencodeGo,
	PROVIDER_GROUPS.openrouter,
];
