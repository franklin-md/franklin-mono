import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Expand, Scissors } from 'lucide-react';
import { IconActionGroup } from '../actions.js';

afterEach(cleanup);

const actions = [
	{ id: 'expand', label: 'Expand', icon: Expand },
	{ id: 'condense', label: 'Condense', icon: Scissors },
];

it('navigates and activates icons without intercepting adjacent input keys', async () => {
	const onAction = vi.fn();
	const inputKey = vi.fn();
	render(
		<>
			<IconActionGroup label="Presets" actions={actions} onAction={onAction} />
			<textarea aria-label="Request" onKeyDown={inputKey} />
			<select aria-label="Style">
				<option>Brief</option>
				<option>Detailed</option>
			</select>
		</>,
	);
	const expand = screen.getByRole('button', { name: 'Expand' });
	const condense = screen.getByRole('button', { name: 'Condense' });
	expand.focus();
	for (const [key, target] of [
		['ArrowRight', condense],
		['ArrowRight', expand],
		['ArrowLeft', condense],
		['ArrowDown', expand],
		['ArrowUp', condense],
		['Home', expand],
		['End', condense],
	] as const) {
		fireEvent.keyDown(document.activeElement ?? expand, { key });
		await waitFor(() => expect(document.activeElement).toBe(target));
		expect(target.tabIndex).toBe(0);
	}
	expect(expand.tabIndex).toBe(-1);
	fireEvent.click(condense);
	expect(onAction).toHaveBeenCalledExactlyOnceWith('condense');
	const input = screen.getByRole('textbox', { name: 'Request' });
	input.focus();
	expect(fireEvent.keyDown(input, { key: 'ArrowLeft' })).toBe(true);
	expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
	expect(inputKey).toHaveBeenCalledTimes(2);
	const picker = screen.getByRole('combobox', { name: 'Style' });
	picker.focus();
	expect(fireEvent.keyDown(picker, { key: 'ArrowDown' })).toBe(true);
	expect(onAction).toHaveBeenCalledOnce();
});

it('allows native Enter and Space activation without swallowing their key events', () => {
	const onKeyDown = vi.fn();
	render(
		<div onKeyDown={onKeyDown}>
			<IconActionGroup label="Presets" actions={actions} onAction={vi.fn()} />
		</div>,
	);
	const expand = screen.getByRole('button', { name: 'Expand' });
	expand.focus();
	expect(fireEvent.keyDown(expand, { key: 'Enter' })).toBe(true);
	expect(fireEvent.keyDown(expand, { key: ' ' })).toBe(true);
	expect(onKeyDown).toHaveBeenCalledTimes(2);
});
