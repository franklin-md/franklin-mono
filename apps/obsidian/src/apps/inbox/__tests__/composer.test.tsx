// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Composer } from '../ui/composer.js';

afterEach(cleanup);

describe('inbox composer regression contract', () => {
	it('C01: sends with Enter but leaves Shift+Enter and IME composition alone', async () => {
		const submit = vi.fn(async () => {});
		render(<Composer onSubmit={submit} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '  My question  ' } });
		expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(
			true,
		);
		expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(
			true,
		);
		expect(submit).not.toHaveBeenCalled();
		await act(async () => {
			fireEvent.keyDown(input, { key: 'Enter' });
		});
		expect(submit).toHaveBeenCalledExactlyOnceWith('My question');
		expect((input as HTMLTextAreaElement).value).toBe('');
	});

	it('C02: guards repeated submission in the same event batch and clears only after success', async () => {
		let finish: (() => void) | undefined;
		const submit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		render(<Composer onSubmit={submit} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'Keep until saved' } });
		const form = input.closest('form');
		if (!form) throw new Error('Expected composer form');
		act(() => {
			fireEvent.submit(form);
			fireEvent.submit(form);
		});
		expect(submit).toHaveBeenCalledTimes(1);
		expect((input as HTMLTextAreaElement).value).toBe('Keep until saved');
		expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
		await act(async () => {
			finish?.();
		});
		expect((input as HTMLTextAreaElement).value).toBe('');
	});

	it('C02: keeps a failed draft and permits retrying it', async () => {
		const submit = vi
			.fn()
			.mockRejectedValueOnce(new Error('disk full'))
			.mockResolvedValueOnce(undefined);
		render(<Composer compact onSubmit={submit} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'Keep my follow-up' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Send follow-up' }));
		});
		expect(screen.getByRole('alert').textContent).toBe('disk full');
		expect((input as HTMLTextAreaElement).value).toBe('Keep my follow-up');
		await act(async () => {
			fireEvent.keyDown(input, { key: 'Enter' });
		});
		expect(submit).toHaveBeenCalledTimes(2);
		expect((input as HTMLTextAreaElement).value).toBe('');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('C01/V05: rejects blank text and keeps follow-ups free of model controls', () => {
		const submit = vi.fn();
		render(<Composer compact onSubmit={submit} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: ' \n ' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(submit).not.toHaveBeenCalled();
		expect(
			screen.getByRole<HTMLButtonElement>('button', {
				name: 'Send follow-up',
			}).disabled,
		).toBe(true);
		expect(screen.queryByRole('combobox')).toBeNull();
	});
});
