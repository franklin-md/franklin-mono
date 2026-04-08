import type { ComponentType } from 'react';
import {
	Anthropic,
	Claude,
	Codex,
	Gemini,
	MiniMax,
	Moonshot,
	OpenAI,
	OpenRouter,
	Qwen,
	Xiaomi,
	type IconProps,
	XAI,
	ZAI,
} from '@franklin/react';

import type { CatalogModel } from './models/catalog.js';

type IconComponent = ComponentType<IconProps>;

const PROVIDER_ICONS: Record<string, IconComponent> = {
	anthropic: Anthropic,
	'openai-codex': OpenAI,
	openrouter: OpenRouter,
};

function resolveModelIconComponent(model: CatalogModel): IconComponent | null {
	if (model.provider === 'anthropic') return Claude;
	if (model.provider === 'openai-codex') return OpenAI;
	if (model.provider !== 'openrouter') return null;

	if (model.id.startsWith('z-ai/glm')) return ZAI;
	if (model.id.startsWith('google/')) return Gemini;
	if (model.id.startsWith('moonshotai/kimi')) return Moonshot;
	if (model.id.startsWith('minimax/')) return MiniMax;
	if (model.id.startsWith('qwen/')) return Qwen;
	if (model.id.startsWith('xiaomi/mimo')) return Xiaomi;
	if (model.id.startsWith('x-ai/')) return XAI;

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
