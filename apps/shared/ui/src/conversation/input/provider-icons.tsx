import type { ComponentType } from 'react';
import { Icons, type IconProps } from '@franklin/react';

import type { CatalogModel } from './models/catalog.js';

type IconComponent = ComponentType<IconProps>;

const PROVIDER_ICONS: Record<string, IconComponent> = {
	anthropic: Icons.Anthropic,
	'openai-codex': Icons.OpenAI,
	openrouter: Icons.OpenRouter,
};

function resolveModelIconComponent(model: CatalogModel): IconComponent | null {
	if (model.provider === 'anthropic') return Icons.Claude;
	if (model.provider === 'openai-codex') return Icons.OpenAI;
	if (model.provider !== 'openrouter') return null;

	if (model.id.startsWith('deepseek/')) return Icons.DeepSeek;
	if (model.id.startsWith('z-ai/glm')) return Icons.ZAI;
	if (model.id.startsWith('google/')) return Icons.Gemini;
	if (model.id.startsWith('moonshotai/kimi')) return Icons.Moonshot;
	if (model.id.startsWith('minimax/')) return Icons.MiniMax;
	if (model.id.startsWith('qwen/')) return Icons.Qwen;
	if (model.id.startsWith('xiaomi/mimo')) return Icons.Xiaomi;
	if (model.id.startsWith('x-ai/')) return Icons.XAI;

	return null;
}

export function ProviderIcon({
	provider,
	...props
}: { provider: string } & IconProps) {
	const Icon = PROVIDER_ICONS[provider];
	if (!Icon) return null;
	return <Icon {...props} />;
}

export function ModelIcon({
	model,
	fallbackToProvider = true,
	...props
}: {
	model: CatalogModel;
	fallbackToProvider?: boolean;
} & IconProps) {
	const Icon =
		resolveModelIconComponent(model) ??
		(fallbackToProvider ? PROVIDER_ICONS[model.provider] : null);
	if (!Icon) return null;
	return <Icon {...props} />;
}
