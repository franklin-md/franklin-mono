// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickEditPill } from '../pill.js';
import type { QuickEditState } from '../../types.js';

afterEach(cleanup);
const state: QuickEditState = {
	path: 'note.md',
	line: 1,
	selection: '',
	prompt: 'Add a detail',
	status: 'done',
	error: '',
};

describe('quick edit pill', () => {
	it('shows no leading label or controls before the first run', () => {
		const { container } = render(
			<QuickEditPill state={{ ...state, status: 'ready' }} stop={vi.fn()} />,
		);
		expect(container.childElementCount).toBe(0);
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
	it('shows no completion controls after success', () => {
		const { container } = render(
			<QuickEditPill state={state} stop={vi.fn()} />,
		);
		expect(container.textContent).toBe('');
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
	it('exposes Stop while running and shows an error without the retired completion controls', () => {
		const stop = vi.fn();
		const { rerender } = render(
			<QuickEditPill state={{ ...state, status: 'running' }} stop={stop} />,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Stop quick edit' }));
		expect(stop).toHaveBeenCalledOnce();
		expect(
			screen.queryByRole('button', { name: 'Dismiss quick edit' }),
		).toBeNull();
		rerender(
			<QuickEditPill
				state={{ ...state, status: 'failed', error: 'Read the file again' }}
				stop={stop}
			/>,
		);
		expect(screen.getByTitle('Read the file again')).toBeTruthy();
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
});
