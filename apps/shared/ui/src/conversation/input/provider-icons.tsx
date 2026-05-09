import type { ComponentType } from 'react';
import { Icons, type IconProps } from '@franklin/react';

import type { CatalogModel } from './models/catalog.js';

type IconComponent = ComponentType<IconProps>;

// TODO: Good to have type for ModelLab? Basically provider includes middle men like
// OpenRouter, whereas for a given set of models (models.dev), they all come from the same lab

const PROVIDER_ICONS: Record<string, IconComponent> = {
	anthropic: Icons.Anthropic,
	'openai-codex': Icons.OpenAI,
	'opencode-go': Icons.OpenCode,
	openrouter: Icons.OpenRouter,
};

const MODEL_ICON_PREFIXES: {
	prefixes: readonly string[];
	Icon: IconComponent;
}[] = [
	{ prefixes: ['claude-'], Icon: Icons.Claude },
	{ prefixes: ['gpt-'], Icon: Icons.OpenAI },
	{ prefixes: ['deepseek/', 'deepseek-'], Icon: Icons.DeepSeek },
	{ prefixes: ['z-ai/', 'glm-'], Icon: Icons.ZAI },
	{ prefixes: ['google/'], Icon: Icons.Gemini },
	{ prefixes: ['moonshotai/kimi'], Icon: Icons.Moonshot },
	{ prefixes: ['kimi-'], Icon: Icons.Kimi },
	{ prefixes: ['minimax/', 'minimax-'], Icon: Icons.MiniMax },
	{ prefixes: ['mimo-', 'xiaomi/mimo'], Icon: Icons.Xiaomi },
	{ prefixes: ['qwen/', 'qwen'], Icon: Icons.Qwen },
	{ prefixes: ['x-ai/'], Icon: Icons.XAI },
];

function resolveModelIconComponent(model: CatalogModel): IconComponent | null {
	return (
		MODEL_ICON_PREFIXES.find((rule) =>
			rule.prefixes.some((prefix) => model.id.startsWith(prefix)),
		)?.Icon ?? null
	);
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
