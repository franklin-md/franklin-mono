// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickEditPill } from '../pill.js';
import type { QuickEditState } from '../../types.js';
import {
	createDirectiveTestPersistence,
	createDirectiveTestRegistry,
} from '../../../../shared/directives/testing/registry.js';

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
	it('exposes Stop while running and shows an error without the retired completion controls', async () => {
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
		const pill = screen.getByText('Failed').parentElement;
		if (!pill) throw new Error('Expected failure pill');
		fireEvent.focus(pill);
		const details = await screen.findByRole('dialog', {
			name: 'Failure details',
		});
		expect(details.textContent).toContain('Read the file again');
		expect(pill.getAttribute('aria-expanded')).toBe('true');
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
	it.each(['hover', 'focus'])(
		'exposes a persisted long multiline failure on %s',
		async (interaction) => {
			const explanation =
				'What should I note here? “Note that was like this” does not specify the thought to add.\n' +
				'More context is needed. '.repeat(60) +
				'\nLast diagnostic line.';
			const persistence = createDirectiveTestPersistence();
			const registry = await createDirectiveTestRegistry(
				undefined,
				persistence,
			);
			const definition = registry.registerDirective<QuickEditState>(
				'quick-edit',
				() => null,
			);
			const instance = await definition.create({
				...state,
				status: 'failed',
				error: explanation,
			});
			await registry.dispose();
			const restored = await createDirectiveTestRegistry(
				undefined,
				persistence,
			);
			const restoredDefinition = restored.registerDirective<QuickEditState>(
				'quick-edit',
				() => null,
			);
			const saved = restoredDefinition.get(instance.id)?.state.get();
			if (!saved) throw new Error('Expected restored failure');
			render(<QuickEditPill state={saved} stop={vi.fn()} />);
			const pill = screen.getByText('Failed').parentElement;
			if (!pill) throw new Error('Expected failure pill');
			expect(pill.tabIndex).toBe(0);
			expect(pill.hasAttribute('title')).toBe(false);
			if (interaction === 'focus') fireEvent.focus(pill);
			else fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
			const details = await screen.findByRole('dialog', {
				name: 'Failure details',
			});
			expect(details.textContent).toContain(explanation);
			fireEvent.keyDown(pill, { key: 'Escape' });
			await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
			await restored.dispose();
		},
	);
});
