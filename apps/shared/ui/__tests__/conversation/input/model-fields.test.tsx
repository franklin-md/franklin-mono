import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThinkingLevel } from '@franklin/mini-acp';
import { EffortChoice } from '../../../src/conversation/input/model-selector/effort.js';
import { ModelList } from '../../../src/conversation/input/model-selector/list.js';
import { ModelTrigger } from '../../../src/conversation/input/model-selector/trigger.js';
import { MODEL_CATALOG } from '../../../src/conversation/input/models/catalog.js';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../src/primitives/popover.js';

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

const catalog = MODEL_CATALOG.slice(0, 1);

describe('model field pickers without a harness or agent', () => {
	it('reports the chosen model as one value and renders only supplied provider actions', async () => {
		const onChange = vi.fn();
		render(
			<ModelList
				catalog={catalog}
				value={{ provider: 'custom', model: 'saved' }}
				onChange={onChange}
				renderProviderAction={(group) => (
					<button>{group.displayName} account</button>
				)}
			/>,
		);
		expect(
			screen.getByRole('button', { name: 'OpenAI Codex account' }),
		).toBeTruthy();
		expect(screen.queryByRole('button', { name: /OpenCode/ })).toBeNull();
		fireEvent.change(screen.getByRole('combobox'), {
			target: { value: 'GPT-6.2-Sol' },
		});
		fireEvent.click(await screen.findByRole('option', { name: 'GPT-6.2-Sol' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			provider: 'openai-codex',
			model: 'gpt-6.2-sol',
		});
	});

	it('renders no provider actions unless the caller supplies them', () => {
		render(
			<ModelList
				catalog={catalog}
				value={{ provider: 'custom', model: 'saved' }}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('edits effort as a single field with click and arrow keys', async () => {
		const onChange = vi.fn();
		function Harness() {
			const [level, setLevel] = useState<ThinkingLevel>('medium');
			return (
				<EffortChoice
					value={level}
					levels={['low', 'medium', 'high']}
					onChange={(next) => {
						setLevel(next);
						onChange(next);
					}}
				/>
			);
		}
		render(<Harness />);
		expect(screen.getByRole('radiogroup', { name: 'Effort' })).toBeTruthy();
		const medium = screen.getByRole('radio', { name: 'Medium' });
		expect(medium.getAttribute('aria-checked')).toBe('true');
		fireEvent.click(screen.getByRole('radio', { name: 'Low' }));
		expect(onChange).toHaveBeenLastCalledWith('low');
		const low = screen.getByRole('radio', { name: 'Low' });
		low.focus();
		// Radix roving focus moves focus in a timeout and checks the item only
		// while the arrow key is down; a keyDown without keyUp holds it.
		fireEvent.keyDown(low, { key: 'ArrowRight' });
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('medium'));
		expect(medium.getAttribute('aria-checked')).toBe('true');
	});

	it('composes in a caller-owned popover that closes after a model pick', async () => {
		const onModel = vi.fn();
		function Harness() {
			const [open, setOpen] = useState(false);
			const [model, setModel] = useState({
				provider: 'custom',
				model: 'saved',
			});
			const [level, setLevel] = useState<ThinkingLevel>('low');
			return (
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<ModelTrigger
							aria-label="Model"
							value={model}
							catalog={catalog}
							effort={level}
						/>
					</PopoverTrigger>
					<PopoverContent>
						<ModelList
							catalog={catalog}
							value={model}
							onChange={(next) => {
								setModel(next);
								onModel(next);
								setOpen(false);
							}}
						/>
						<EffortChoice
							value={level}
							levels={['low', 'high']}
							onChange={setLevel}
						/>
					</PopoverContent>
				</Popover>
			);
		}
		render(<Harness />);
		const trigger = screen.getByRole('button', { name: 'Model' });
		expect(trigger.textContent).toContain('saved');
		fireEvent.click(trigger);
		// Search is the first focusable control, so Radix focuses it on open.
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('combobox')),
		);
		fireEvent.click(screen.getByRole('radio', { name: 'High' }));
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(trigger.textContent).toContain('High');
		fireEvent.click(await screen.findByRole('option', { name: 'GPT-6.2-Sol' }));
		expect(onModel).toHaveBeenCalledExactlyOnceWith({
			provider: 'openai-codex',
			model: 'gpt-6.2-sol',
		});
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(trigger.textContent).toContain('GPT-6.2-Sol');
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});
});
