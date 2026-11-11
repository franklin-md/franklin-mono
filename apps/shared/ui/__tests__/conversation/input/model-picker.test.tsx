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
	it('can remove effort while its view is open without losing the model list', () => {
		const props = { provider: 'custom', model: 'saved', onSelect: vi.fn() };
		const { rerender } = render(
			<ModelPicker
				{...props}
				effort={{ level: 'low', levels: ['low', 'high'], onChange: vi.fn() }}
			/>,
		);
		fireEvent.click(screen.getByRole('button'));
		fireEvent.click(screen.getByRole('button', { name: 'Effort: Low' }));
		rerender(<ModelPicker {...props} />);
		expect(screen.getByRole('combobox')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /^Effort:/ })).toBeNull();
	});
	it('omits effort when it is not supplied', () => {
		render(<ModelPicker provider="custom" model="saved" onSelect={vi.fn()} />);
		fireEvent.click(screen.getByRole('button'));
		expect(screen.queryByRole('button', { name: /^Effort:/ })).toBeNull();
	});

	it('keeps effort outside model filtering and reports only the chosen effort to its owner', async () => {
		const onChange = vi.fn();
		const onSelect = vi.fn();
		const props = {
			provider: 'custom',
			model: 'saved',
			onSelect,
			effort: {
				level: 'high' as const,
				levels: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const,
				onChange,
			},
		};
		const { rerender } = render(<ModelPicker {...props} />);
		fireEvent.click(screen.getByRole('button'));
		fireEvent.change(screen.getByPlaceholderText('Search models...'), {
			target: { value: 'no-such-model' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Effort: High' }));
		expect(screen.getByRole('listbox', { name: 'Effort levels' })).toBeTruthy();
		expect(screen.getAllByRole('option')).toHaveLength(6);
		fireEvent.click(screen.getByRole('option', { name: 'Minimal' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('minimal');
		expect(onSelect).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Effort: High' })).toBeTruthy();
		rerender(
			<ModelPicker {...props} effort={{ ...props.effort, level: 'minimal' }} />,
		);
		expect(
			screen.getByRole('button', { name: 'Effort: Minimal' }),
		).toBeTruthy();
	});

	it('uses Back or Escape to return from effort, then Escape closes and restores trigger focus', async () => {
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
		fireEvent.click(screen.getByRole('button', { name: 'Effort: Medium' }));
		fireEvent.click(screen.getByRole('button', { name: 'Back to models' }));
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Effort: Medium' }),
		);
		fireEvent.click(screen.getByRole('button', { name: 'Effort: Medium' }));
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: 'Escape',
		});
		await waitFor(() =>
			expect(
				screen.queryByRole('button', { name: 'Back to models' }),
			).toBeNull(),
		);
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Effort: Medium' }),
		);
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: 'Escape',
		});
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
