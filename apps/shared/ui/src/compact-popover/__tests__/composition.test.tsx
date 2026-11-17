import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompactPopover } from '../popover.js';

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it('focuses its content and dismisses without intercepting input navigation or Enter', async () => {
	const onAction = vi.fn();
	const onClose = vi.fn();
	const inputKey = vi.fn();
	render(
		<CompactPopover
			anchor={{
				contextElement: document.body,
				getBoundingClientRect: () => new DOMRect(100, 100, 1, 20),
			}}
			label="Edit tools"
			onClose={onClose}
		>
			<button type="button" onClick={() => onAction('expand')}>
				Expand
			</button>
			<textarea aria-label="Request" onKeyDown={inputKey} />
			<select aria-label="Style">
				<option>Brief</option>
				<option>Detailed</option>
			</select>
		</CompactPopover>,
	);
	const expand = await screen.findByRole('button', { name: 'Expand' });
	expect(document.activeElement).toBe(expand);
	fireEvent.click(expand);
	expect(onAction).toHaveBeenCalledExactlyOnceWith('expand');
	const input = screen.getByRole('textbox', { name: 'Request' });
	input.focus();
	expect(fireEvent.keyDown(input, { key: 'ArrowLeft' })).toBe(true);
	expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
	expect(inputKey).toHaveBeenCalledTimes(2);
	const picker = screen.getByRole('combobox', { name: 'Style' });
	picker.focus();
	expect(fireEvent.keyDown(picker, { key: 'ArrowDown' })).toBe(true);
	expect(onAction).toHaveBeenCalledOnce();
	expect(fireEvent.keyDown(picker, { key: 'Escape' })).toBe(false);
	expect(onClose).toHaveBeenCalledExactlyOnceWith(true);
});
