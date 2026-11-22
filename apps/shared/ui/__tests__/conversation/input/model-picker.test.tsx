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

const saved = { provider: 'custom', model: 'saved' };

function checked(name: string) {
	return screen.getByRole('radio', { name }).getAttribute('aria-checked');
}

describe('controlled model picker', () => {
	it.each([
		['gemini', 'Gemini 4 Hydrogen', 'google/gemini-4-hydrogen'],
		['glm', 'GLM 5.3 Prime', 'z-ai/glm-5.3-prime'],
	])(
		'searches for %s and selects its OpenRouter model',
		async (search, name, id) => {
			const onChange = vi.fn();
			render(<ModelPicker value={saved} onChange={onChange} />);
			fireEvent.click(screen.getByRole('button'));
			fireEvent.change(screen.getByPlaceholderText('Search models...'), {
				target: { value: search },
			});
			fireEvent.click(await screen.findByRole('option', { name }));
			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				provider: 'openrouter',
				model: id,
			});
			expect(screen.queryByRole('dialog')).toBeNull();
		},
	);

	it('accepts caller-supplied models absent from the request catalog', async () => {
		const onChange = vi.fn();
		render(
			<ModelPicker
				value={{ provider: 'private', model: 'my-model' }}
				onChange={onChange}
				catalog={[
					{
						provider: 'private',
						displayName: 'Private models',
						access: 'api',
						models: [
							{
								id: 'my-model',
								provider: 'private',
								name: 'My model',
								reasoning: false,
								contextWindow: 8192,
								costInput: 0,
								costOutput: 0,
							},
						],
					},
				]}
			/>,
		);
		expect(screen.getByRole('button').textContent).toBe('My model');
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getAllByRole('option')).toHaveLength(1);
		fireEvent.click(await screen.findByRole('option', { name: 'My model' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			provider: 'private',
			model: 'my-model',
		});
	});

	it('focuses search when the picker opens', async () => {
		render(<ModelPicker value={saved} onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button'));
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('combobox')),
		);
	});

	it('can remove inline effort while the picker is open without losing the model list', () => {
		const props = { value: saved, onChange: vi.fn() };
		const { rerender } = render(
			<ModelPicker
				{...props}
				effort={{ value: 'low', levels: ['low', 'high'], onChange: vi.fn() }}
			/>,
		);
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('radiogroup', { name: 'Effort' })).toBeTruthy();
		rerender(<ModelPicker {...props} />);
		expect(screen.getByRole('combobox')).toBeTruthy();
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('omits effort and its trigger summary when it is not supplied', () => {
		render(<ModelPicker value={saved} onChange={vi.fn()} />);
		expect(screen.getByRole('button').textContent).toBe('saved');
		fireEvent.click(screen.getByRole('button'));
		expect(screen.queryByRole('radiogroup')).toBeNull();
	});

	it('keeps inline effort outside filtering and reports only the chosen effort to its owner', () => {
		const onEffort = vi.fn();
		const onChange = vi.fn();
		const levels = ['off', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
		const props = { value: saved, onChange };
		const { rerender } = render(
			<ModelPicker
				{...props}
				effort={{ value: 'high', levels, onChange: onEffort }}
			/>,
		);
		fireEvent.click(screen.getByRole('button'));
		fireEvent.change(screen.getByPlaceholderText('Search models...'), {
			target: { value: 'no-such-model' },
		});
		expect(screen.getAllByRole('radio')).toHaveLength(6);
		expect(screen.getByRole('radio', { name: 'Max' })).toBeTruthy();
		expect(checked('High')).toBe('true');
		fireEvent.click(screen.getByRole('radio', { name: 'Low' }));
		expect(onEffort).toHaveBeenCalledExactlyOnceWith('low');
		expect(onChange).not.toHaveBeenCalled();
		expect(checked('High')).toBe('true');
		expect(screen.getByRole<HTMLInputElement>('combobox').value).toBe(
			'no-such-model',
		);
		expect(screen.queryByRole('button', { name: 'Back to models' })).toBeNull();
		rerender(
			<ModelPicker
				{...props}
				effort={{ value: 'low', levels, onChange: onEffort }}
			/>,
		);
		expect(checked('Low')).toBe('true');
		expect(onEffort).toHaveBeenCalledTimes(1);
	});

	it('shows the compact current effort beside the model name and reflects external updates', () => {
		const props = {
			value: { provider: 'openai-codex', model: 'gpt-6.2-sol' },
			onChange: vi.fn(),
		};
		const levels = ['medium', 'xhigh'] as const;
		const onEffort = vi.fn();
		const { rerender } = render(
			<ModelPicker
				{...props}
				effort={{ value: 'medium', levels, onChange: onEffort }}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain('GPT-6.2-Sol');
		expect(screen.getByRole('button').textContent).toContain('Med');
		rerender(
			<ModelPicker
				{...props}
				effort={{ value: 'xhigh', levels, onChange: onEffort }}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain('XHigh');
		expect(screen.getByRole('button').title).toContain('Extra high');
		expect(onEffort).not.toHaveBeenCalled();
	});

	it('closes on Escape from an effort choice and restores trigger focus', async () => {
		render(
			<ModelPicker
				value={saved}
				label="Choose model"
				onChange={vi.fn()}
				effort={{
					value: 'medium',
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
	it('preserves a saved model outside the catalog and reflects external changes', () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<ModelPicker
				value={{ provider: 'custom', model: 'my-private-model' }}
				onChange={onChange}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain(
			'my-private-model',
		);
		expect(screen.getByRole('button').title).toContain('custom');
		rerender(
			<ModelPicker
				value={{ provider: 'openai-codex', model: 'gpt-6.2-sol' }}
				onChange={onChange}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain('GPT-6.2-Sol');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('searches catalog choices and sends the selected provider/model to its owner', async () => {
		const onChange = vi.fn();
		render(
			<ModelPicker
				value={{ provider: 'custom', model: 'saved-model' }}
				onChange={onChange}
				label="Choose model"
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Choose model' }));
		fireEvent.change(screen.getByPlaceholderText('Search models...'), {
			target: { value: 'gpt-6.2-sol' },
		});
		fireEvent.click(await screen.findByRole('option', { name: 'GPT-6.2-Sol' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			provider: 'openai-codex',
			model: 'gpt-6.2-sol',
		});
		expect(screen.queryByPlaceholderText('Search models...')).toBeNull();
	});
});
