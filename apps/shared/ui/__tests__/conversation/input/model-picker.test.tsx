import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
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
	it('can remove inline effort while the picker is open without losing the model list', () => {
		const props = { provider: 'custom', model: 'saved', onSelect: vi.fn() };
		const { rerender } = render(
			<ModelPicker
				{...props}
				effort={{ level: 'low', levels: ['low', 'high'], onChange: vi.fn() }}
			/>,
		);
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('radiogroup', { name: 'Effort' })).toBeTruthy();
		rerender(<ModelPicker {...props} />);
		expect(screen.getByRole('combobox')).toBeTruthy();
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('omits effort and its trigger summary when it is not supplied', () => {
		render(<ModelPicker provider="custom" model="saved" onSelect={vi.fn()} />);
		expect(screen.getByRole('button').textContent).toBe('saved');
		fireEvent.click(screen.getByRole('button'));
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('keeps inline effort outside filtering and reports only the chosen effort to its owner', () => {
		const onChange = vi.fn();
		const onSelect = vi.fn();
		const levels = [
			'off',
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
		] as const;
		const props = { provider: 'custom', model: 'saved', onSelect };
		const { rerender } = render(
			<ModelPicker {...props} effort={{ level: 'high', levels, onChange }} />,
		);
		fireEvent.click(screen.getByRole('button'));
		fireEvent.change(screen.getByPlaceholderText('Search models...'), {
			target: { value: 'no-such-model' },
		});
		expect(screen.getAllByRole('radio')).toHaveLength(6);
		expect(
			screen.getByRole<HTMLInputElement>('radio', { name: 'High' }).checked,
		).toBe(true);
		fireEvent.click(screen.getByRole('radio', { name: 'Minimal' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('minimal');
		expect(onSelect).not.toHaveBeenCalled();
		expect(
			screen.getByRole<HTMLInputElement>('radio', { name: 'High' }).checked,
		).toBe(true);
		expect(screen.getByRole<HTMLInputElement>('combobox').value).toBe(
			'no-such-model',
		);
		expect(screen.queryByRole('button', { name: 'Back to models' })).toBeNull();
		rerender(
			<ModelPicker
				{...props}
				effort={{ level: 'minimal', levels, onChange }}
			/>,
		);
		expect(
			screen.getByRole<HTMLInputElement>('radio', { name: 'Minimal' }).checked,
		).toBe(true);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('shows the compact current effort beside the model name and reflects external updates', () => {
		const props = {
			provider: 'openai-codex',
			model: 'gpt-6.1-sol',
			onSelect: vi.fn(),
		};
		const levels = ['medium', 'xhigh'] as const;
		const onChange = vi.fn();
		const { rerender } = render(
			<ModelPicker {...props} effort={{ level: 'medium', levels, onChange }} />,
		);
		expect(screen.getByRole('button').textContent).toContain('GPT-6.1-Sol');
		expect(screen.getByRole('button').textContent).toContain('Med');
		rerender(
			<ModelPicker {...props} effort={{ level: 'xhigh', levels, onChange }} />,
		);
		expect(screen.getByRole('button').textContent).toContain('XHigh');
		expect(screen.getByRole('button').title).toContain('Extra high');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('closes on Escape from an effort choice and restores trigger focus', async () => {
		render(
			<ModelPicker
				provider="custom"
				model="saved"
				label="Choose model"
				onSelect={vi.fn()}
				effort={{
					level: 'medium',
					levels: ['low', 'medium', 'high'],
					onChange: vi.fn(),
				}}
			/>,
		);
		const trigger = screen.getByRole('button', { name: 'Choose model' });
		fireEvent.click(trigger);
		const selected = screen.getByRole('radio', { name: 'Medium' });
		selected.focus();
		fireEvent.keyDown(selected, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});
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
