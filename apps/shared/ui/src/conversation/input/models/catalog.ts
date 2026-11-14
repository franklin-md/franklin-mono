import { resolveModel } from '@franklin/mini-acp/models';

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

function group(
	provider: string,
	displayName: string,
	access: AccessType,
	entries: readonly (readonly [id: string, name: string])[],
): ProviderGroup {
	return {
		provider,
		displayName,
		access,
		models: entries.flatMap(([id, name]) => {
			const resolved = resolveModel({ provider, model: id });
			// An upstream removal must not prevent the remaining choices from loading.
			if (!resolved.ok) return [];
			const model = resolved.model;
			return [
				{
					id,
					provider,
					name,
					reasoning: model.reasoning,
					contextWindow: model.contextWindow,
					costInput: model.cost.input,
					costOutput: model.cost.output,
				},
			];
		}),
	};
}

// Curate presentation here; request resolution owns capabilities and estimates.
export const MODEL_CATALOG: ProviderGroup[] = [
	group('openai-codex', 'OpenAI Codex', 'sub', [
		['gpt-6-astra', 'GPT-6-Astra'],
		['gpt-6.1-sol', 'GPT-6.1-Sol'],
		['gpt-5.6-terra', 'GPT-5.6 Terra'],
		['gpt-5.6-luna', 'GPT-5.6 Luna'],
		['gpt-5.5', 'GPT-5.5'],
		['gpt-5.4', 'GPT-5.4'],
		['gpt-5.4-mini', 'GPT-5.4 Mini'],
	]),
	group('opencode-go', 'OpenCode Go', 'api', [
		['grok-4.6', 'Grok 4.6'],
		['gpt-5.6-luna', 'GPT 5.6 Luna'],
		['glm-5.3', 'GLM-5.3'],
		['glm-5.3-flash', 'GLM-5.3-Flash'],
		['kimi-k3', 'Kimi K3'],
		['kimi-k2.7-code', 'Kimi K2.7 Code'],
		['longcat-2.0', 'LongCat-2.0'],
		['mimo-v2.5', 'MiMo V2.5'],
		['mimo-v2.5-pro', 'MiMo V2.5 Pro'],
		['minimax-m3', 'MiniMax M3'],
		['muse-spark-1.3-contributor', 'Muse Spark 1.3 Contributor'],
		['qwen3.8-flash', 'Qwen3.8 Flash'],
		['qwen3.8-max', 'Qwen3.8 Max'],
		['deepseek-v4-pro', 'DeepSeek V4 Pro'],
		['deepseek-flash', 'DeepSeek V4.1 Flash'],
		['deepseek-v4-flash-vision-exp', 'DeepSeek V4 Flash Vision Exp'],
		['hy4-preview', 'Hy4 Preview'],
	]),
	group('openrouter', 'OpenRouter', 'api', [
		['anthropic/claude-fable-5.2', 'Claude Fable 5.2'],
		['anthropic/claude-opus-5.5', 'Claude Opus 5.5'],
		['z-ai/glm-5.1', 'GLM 5.1'],
		['qwen/qwen3.6-plus', 'Qwen3.6 Plus'],
		['qwen/qwen3.7-max', 'Qwen3.7 Max'],
		['deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash'],
		['deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro'],
		['x-ai/grok-4.5', 'Grok 4.5'],
		['x-ai/grok-4.20', 'Grok 4.20'],
		['google/gemini-4-argon', 'Gemini 4 Argon'],
		['google/gemini-4-carbon', 'Gemini 4 Carbon'],
		['google/gemini-4-hydrogen', 'Gemini 4 Hydrogen'],
		['google/gemini-3.8-flash', 'Gemini 3.8 Flash'],
		['google/gemini-3.5-flash', 'Gemini 3.5 Flash'],
		['google/gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite Preview'],
		[
			'google/gemini-3.1-pro-preview-customtools',
			'Gemini 3.1 Pro Preview Custom Tools',
		],
		['xiaomi/mimo-v2.5-pro', 'MiMo-V2.5-Pro'],
		['minimax/minimax-m2.7', 'MiniMax M2.7'],
		['moonshotai/kimi-k2.6', 'Kimi K2.6'],
	]),
];
