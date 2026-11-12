import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icons } from '@franklin/react';
import type { ReactElement } from 'react';

import { MODEL_CATALOG } from '../../../src/conversation/input/models/catalog.js';
import {
	ModelIcon,
	ProviderIcon,
} from '../../../src/conversation/input/provider-icons.js';

import type { CatalogModel } from '../../../src/conversation/input/models/catalog.js';

function catalogModel(provider: string, id: string): CatalogModel {
	return {
		id,
		provider,
		name: id,
		reasoning: true,
		contextWindow: 1_000_000,
		costInput: 1,
		costOutput: 1,
	};
}

function renderedSvgMarkup(element: ReactElement): string | null {
	return (
		render(element)
			.container.querySelector('svg')
			?.innerHTML.replaceAll(/:r[0-9a-z]+:/g, ':react-id:') ?? null
	);
}

describe('ProviderIcon', () => {
	it('uses the sourced OpenCode mark for OpenCode Go', () => {
		const { container } = render(<ProviderIcon provider="opencode-go" />);

		expect(container.querySelector('path')?.getAttribute('d')).toBe(
			'M16 6H8v12h8V6zm4 16H4V2h16v20z',
		);
	});

	it('uses the sourced Mistral mark for Mistral', () => {
		expect(renderedSvgMarkup(<ProviderIcon provider="mistral" />)).toBe(
			renderedSvgMarkup(<Icons.Mistral />),
		);
	});
});

describe('ModelIcon', () => {
	const catalogModelIcons = [
		['openai-codex', 'gpt-6-astra', Icons.OpenAI],
		['openai-codex', 'gpt-6.1-sol', Icons.OpenAI],
		['openai-codex', 'gpt-5.6-terra', Icons.OpenAI],
		['openai-codex', 'gpt-5.6-luna', Icons.OpenAI],
		['openai-codex', 'gpt-5.5', Icons.OpenAI],
		['openai-codex', 'gpt-5.4', Icons.OpenAI],
		['openai-codex', 'gpt-5.4-mini', Icons.OpenAI],
		['opencode-go', 'grok-4.6', Icons.XAI],
		['opencode-go', 'gpt-5.6-luna', Icons.OpenAI],
		['opencode-go', 'glm-5.3', Icons.ZAI],
		['opencode-go', 'glm-5.3-flash', Icons.ZAI],
		['opencode-go', 'kimi-k3', Icons.Kimi],
		['opencode-go', 'kimi-k2.7-code', Icons.Kimi],
		['opencode-go', 'longcat-2.0', Icons.OpenCode],
		['opencode-go', 'mimo-v2.5', Icons.Xiaomi],
		['opencode-go', 'mimo-v2.5-pro', Icons.Xiaomi],
		['opencode-go', 'minimax-m3', Icons.MiniMax],
		['opencode-go', 'muse-spark-1.3-contributor', Icons.Meta],
		['opencode-go', 'qwen3.8-flash', Icons.Qwen],
		['opencode-go', 'qwen3.8-max', Icons.Qwen],
		['opencode-go', 'deepseek-v4-pro', Icons.DeepSeek],
		['opencode-go', 'deepseek-flash', Icons.DeepSeek],
		['opencode-go', 'deepseek-v4-flash-vision-exp', Icons.DeepSeek],
		['opencode-go', 'hy4-preview', Icons.OpenCode],
		['openrouter', 'z-ai/glm-5.1', Icons.ZAI],
		['openrouter', 'qwen/qwen3.6-plus', Icons.Qwen],
		['openrouter', 'qwen/qwen3.7-max', Icons.Qwen],
		['openrouter', 'deepseek/deepseek-v4-flash', Icons.DeepSeek],
		['openrouter', 'deepseek/deepseek-v4-pro', Icons.DeepSeek],
		['openrouter', 'x-ai/grok-4.5', Icons.XAI],
		['openrouter', 'x-ai/grok-4.20', Icons.XAI],
		['openrouter', 'google/gemini-3.5-flash', Icons.Gemini],
		['openrouter', 'google/gemini-3.1-flash-lite-preview', Icons.Gemini],
		['openrouter', 'google/gemini-3.1-pro-preview-customtools', Icons.Gemini],
		['openrouter', 'xiaomi/mimo-v2.5-pro', Icons.Xiaomi],
		['openrouter', 'minimax/minimax-m2.7', Icons.MiniMax],
		['openrouter', 'moonshotai/kimi-k2.6', Icons.Moonshot],
	] as const;

	it('has icon expectations for every curated model', () => {
		expect(
			catalogModelIcons.map(([provider, id]) => `${provider}:${id}`),
		).toEqual(
			MODEL_CATALOG.flatMap((group) =>
				group.models.map((model) => `${model.provider}:${model.id}`),
			),
		);
	});

	it.each(catalogModelIcons)(
		'resolves %s %s from the model id',
		(provider, id, ExpectedIcon) => {
			const model = MODEL_CATALOG.flatMap((group) => group.models).find(
				(catalogModel) =>
					catalogModel.provider === provider && catalogModel.id === id,
			);

			expect(model).toBeDefined();
			if (!model) return;

			expect(
				renderedSvgMarkup(
					<ModelIcon fallbackToProvider={false} model={model} />,
				),
			).toBe(renderedSvgMarkup(<ExpectedIcon />));
		},
	);

	it('falls back to the provider icon for unrecognized model ids', () => {
		expect(
			renderedSvgMarkup(
				<ModelIcon model={catalogModel('opencode-go', 'unknown-model')} />,
			),
		).toBe(renderedSvgMarkup(<Icons.OpenCode />));
	});

	it('can disable provider fallback for unrecognized model ids', () => {
		const { container } = render(
			<ModelIcon
				fallbackToProvider={false}
				model={catalogModel('opencode-go', 'unknown-model')}
			/>,
		);

		expect(container.querySelector('svg')).toBeNull();
	});
});
