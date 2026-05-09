import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
		intelligence: 'strong',
	};
}

describe('ProviderIcon', () => {
	it('uses the sourced OpenCode mark for OpenCode Go', () => {
		const { container } = render(<ProviderIcon provider="opencode-go" />);

		expect(container.querySelector('path')?.getAttribute('d')).toBe(
			'M16 6H8v12h8V6zm4 16H4V2h16v20z',
		);
	});
});

describe('ModelIcon', () => {
	it('resolves OpenCode Go model family icons before provider fallback', () => {
		const { container } = render(
			<ModelIcon
				fallbackToProvider={false}
				model={catalogModel('opencode-go', 'qwen3.6-plus')}
			/>,
		);

		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('uses the same Xiaomi mark for OpenCode Go MiMo and OpenRouter MiMo', () => {
		const opencode = render(
			<ModelIcon
				fallbackToProvider={false}
				model={catalogModel('opencode-go', 'mimo-v2.5-pro')}
			/>,
		);
		const openrouter = render(
			<ModelIcon
				fallbackToProvider={false}
				model={catalogModel('openrouter', 'xiaomi/mimo-v2.5-pro')}
			/>,
		);

		expect(opencode.container.querySelector('path')?.getAttribute('d')).toBe(
			openrouter.container.querySelector('path')?.getAttribute('d'),
		);
	});
});
