import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../primitives/popover.js';

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

function renderPopover(children: ReactNode) {
	const onOpenChange = vi.fn();
	function Composition() {
		const [open, setOpen] = useState(false);
		return (
			<Popover
				open={open}
				onOpenChange={(value) => {
					setOpen(value);
					onOpenChange(value);
				}}
			>
				<PopoverTrigger>Open tools</PopoverTrigger>
				<PopoverContent
					aria-label="Edit tools"
					side="top"
					align="center"
					sideOffset={6}
					collisionPadding={8}
					className="w-max max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto p-1"
				>
					{children}
				</PopoverContent>
			</Popover>
		);
	}
	render(<Composition />);
	const trigger = screen.getByRole('button', { name: 'Open tools' });
	fireEvent.click(trigger);
	onOpenChange.mockClear();
	return { onOpenChange, trigger };
}

it('focuses its content and dismisses without intercepting input navigation or Enter', async () => {
	const onAction = vi.fn();
	const inputKey = vi.fn();
	const { onOpenChange, trigger } = renderPopover(
		<>
			<button type="button" onClick={() => onAction('expand')}>
				Expand
			</button>
			<textarea aria-label="Request" onKeyDown={inputKey} />
			<select aria-label="Style">
				<option>Brief</option>
				<option>Detailed</option>
			</select>
		</>,
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
	expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('skips controls excluded from the tab order when focusing on open', async () => {
	renderPopover(
		<>
			<button type="button" tabIndex={-1}>
				Secondary action
			</button>
			<button type="button">Expand</button>
		</>,
	);
	const expand = await screen.findByRole('button', { name: 'Expand' });
	expect(document.activeElement).toBe(expand);
});

it('lets inputs receive Tab without dismissing the popover', () => {
	const inputKey = vi.fn();
	const { onOpenChange } = renderPopover(
		<textarea aria-label="Request" onKeyDown={inputKey} />,
	);
	const input = screen.getByRole('textbox', { name: 'Request' });
	input.focus();
	fireEvent.keyDown(input, { key: 'Tab' });
	expect(inputKey).toHaveBeenCalledOnce();
	expect(onOpenChange).not.toHaveBeenCalled();
});

it('focuses the content when there are no tabbable controls', () => {
	renderPopover(<p>No presets available.</p>);
	expect(document.activeElement).toBe(
		screen.getByRole('dialog', { name: 'Edit tools' }),
	);
});
