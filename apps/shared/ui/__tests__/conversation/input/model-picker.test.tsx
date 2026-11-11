import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelPicker } from '../../../src/conversation/input/model-selector/picker.js';

// Authentication actions have their own integration suite. The picker itself
// must be usable without an active chat agent.
vi.mock(
	'../../../src/conversation/input/model-selector/auth-shortcut/index.js',
	() => ({ ProviderAuthAction: () => null }),
);

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('controlled model picker', () => {
	it('C04: preserves a saved model outside the catalog and reflects external changes', () => {
		const select = vi.fn();
		const { rerender } = render(
			<ModelPicker
				provider="custom"
				model="my-private-model"
				onSelect={select}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain(
			'my-private-model',
		);
		expect(screen.getByRole('button').title).toContain('custom');
		rerender(
			<ModelPicker
				provider="openai-codex"
				model="gpt-6.1-sol"
				onSelect={select}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain('GPT-6.1-Sol');
		expect(select).not.toHaveBeenCalled();
	});

	it('C04: searches catalog choices and sends the selected provider/model to its owner', async () => {
		const select = vi.fn();
		render(
			<ModelPicker
				provider="custom"
				model="saved-model"
				onSelect={select}
				label="Inbox model"
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Inbox model' }));
		fireEvent.change(screen.getByPlaceholderText('Search models...'), {
			target: { value: 'gpt-6.1-sol' },
		});
		fireEvent.click(await screen.findByRole('option', { name: 'GPT-6.1-Sol' }));
		expect(select).toHaveBeenCalledExactlyOnceWith(
			'openai-codex',
			'gpt-6.1-sol',
		);
		expect(screen.queryByPlaceholderText('Search models...')).toBeNull();
	});
});
