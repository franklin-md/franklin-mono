// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickEditPill } from '../pill.js';
import type { QuickEditState } from '../../types.js';

afterEach(cleanup);
const state: QuickEditState = { path: 'note.md', line: 1, selection: '', prompt: 'Add a detail', status: 'done', error: '' };

describe('quick edit pill', () => {
	it('dismisses and amends independently without accepting file changes', () => {
		const dismiss = vi.fn(); const edit = vi.fn();
		render(<QuickEditPill state={state} dismiss={dismiss} edit={edit} stop={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss quick edit' }));
		expect(dismiss).toHaveBeenCalledOnce();
		expect(edit).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Amend quick edit' }));
		expect(edit).toHaveBeenCalledOnce();
	});
	it('exposes Stop while running and retains an actionable error after failure', () => {
		const stop = vi.fn();
		const { rerender } = render(<QuickEditPill state={{ ...state, status: 'running' }} dismiss={vi.fn()} edit={vi.fn()} stop={stop} />);
		fireEvent.click(screen.getByRole('button', { name: 'Stop quick edit' }));
		expect(stop).toHaveBeenCalledOnce();
		expect(screen.queryByRole('button', { name: 'Dismiss quick edit' })).toBeNull();
		rerender(<QuickEditPill state={{ ...state, status: 'failed', error: 'Read the file again' }} dismiss={vi.fn()} edit={vi.fn()} stop={stop} />);
		expect(screen.getByTitle('Read the file again')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Amend quick edit' })).toBeTruthy();
	});
});
