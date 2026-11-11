// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CapturePanel } from '../panel.js';

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

function mount(onSubmit = vi.fn(async (_action: string) => {})) {
	const onClose = vi.fn();
	render(
		<CapturePanel
			anchor={{
				contextElement: document.body,
				getBoundingClientRect: () => new DOMRect(30, 40, 1, 20),
			}}
			onSubmit={onSubmit}
			onClose={onClose}
		/>,
	);
	return { onSubmit, onClose };
}

it('opens without submitting and runs ThoughtDump immediately using arrow keys and Enter', async () => {
	const { onSubmit } = mount();
	const quick = await screen.findByRole('button', { name: /QuickAdd/ });
	expect(document.activeElement).toBe(quick);
	expect(onSubmit).not.toHaveBeenCalled();
	fireEvent.keyDown(quick, { key: 'ArrowDown' });
	const dump = screen.getByRole('button', { name: /ThoughtDump/ });
	expect(document.activeElement).toBe(dump);
	await act(async () => {
		fireEvent.keyDown(dump, { key: 'Enter' });
	});
	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('thought-dump');
	expect(screen.queryByRole('textbox')).toBeNull();
});

it('guards repeated submission while saving', async () => {
	let finish!: () => void;
	const { onSubmit } = mount(
		vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		),
	);
	const quick = await screen.findByRole('button', { name: /QuickAdd/ });
	act(() => {
		fireEvent.click(quick);
		fireEvent.click(quick);
		fireEvent.keyDown(quick, { key: 'Enter' });
	});
	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('quick-add');
	await act(async () => {
		finish();
	});
});

it('retains a failed action for retry and prevents switching to a second action', async () => {
	const { onSubmit } = mount(
		vi
			.fn()
			.mockRejectedValueOnce(new Error('disk full'))
			.mockResolvedValue(undefined),
	);
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: /QuickAdd/ }));
	});
	expect(screen.getByRole('alert').textContent).toContain('disk full');
	expect(screen.queryByRole('button', { name: /ThoughtDump/ })).toBeNull();
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
	});
	expect(onSubmit.mock.calls).toEqual([['quick-add'], ['quick-add']]);
});

it('Escape cancels and consumes the keyboard event', async () => {
	const { onClose, onSubmit } = mount();
	const quick = await screen.findByRole('button', { name: /QuickAdd/ });
	expect(fireEvent.keyDown(quick, { key: 'Escape' })).toBe(false);
	expect(onClose).toHaveBeenCalledExactlyOnceWith(true);
	expect(onSubmit).not.toHaveBeenCalled();
});
