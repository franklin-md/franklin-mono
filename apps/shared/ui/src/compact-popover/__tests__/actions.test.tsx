import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Expand, Scissors } from 'lucide-react';
import { IconActionGroup } from '../actions.js';

afterEach(cleanup);

it('navigates and activates icons without intercepting adjacent input keys', () => {
	const onAction = vi.fn();
	const inputKey = vi.fn();
	render(
		<>
			<IconActionGroup
				label="Presets"
				actions={[
					{ id: 'expand', label: 'Expand', icon: Expand },
					{ id: 'condense', label: 'Condense', icon: Scissors },
				]}
				onAction={onAction}
			/>
			<textarea aria-label="Request" onKeyDown={inputKey} />
			<select aria-label="Style">
				<option>Brief</option>
				<option>Detailed</option>
			</select>
		</>,
	);
	const expand = screen.getByRole('button', { name: 'Expand' });
	expand.focus();
	fireEvent.keyDown(expand, { key: 'ArrowRight' });
	const condense = screen.getByRole('button', { name: 'Condense' });
	expect(document.activeElement).toBe(condense);
	fireEvent.keyDown(condense, { key: 'Enter' });
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
