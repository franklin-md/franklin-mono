// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../controller/index.js';
import { testAction, upsertAction } from '../testing/action.js';
import { createInboxCodecPersistence } from '../testing/persistence.js';
import { InboxPanel } from '../ui/panel.js';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('question action controls', () => {
	it('runs on a selected answered card, shows failure/retry, and restores the button after successful cleanup', async () => {
		HTMLElement.prototype.scrollTo = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		let finish!: (summary: string) => void;
		let fail!: (error: Error) => void;
		const runAction = vi.fn(
			() =>
				new Promise<string>((resolve, reject) => {
					finish = resolve;
					fail = reject;
				}),
		);
		const inbox = await InboxController.create({
			defaults: { provider: 'test', model: 'test', reasoning: 'off' },
			persistence: createInboxCodecPersistence(),
			run: async ({ submit }) => {
				await submit('The condition may change.');
			},
			runAction,
		});
		await inbox.settings.configure(({ actions }) => ({
			actions: upsertAction(testAction('cards', '🃏', 'Create flashcards'))(
				actions,
			),
		}));
		render(
			<InboxPanel
				controller={inbox}
				onOpenSource={vi.fn()}
				onSettings={vi.fn()}
				onError={vi.fn()}
			/>,
		);
		await act(async () => {
			await inbox.add('Why recheck?');
		});
		await screen.findByText('The condition may change.');
		expect(screen.queryByRole('button', { name: 'Run 🃏' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Why recheck?' }));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Run 🃏' }));
		});
		expect(
			screen.getByRole('button', { name: 'Run 🃏' }).hasAttribute('disabled'),
		).toBe(true);
		expect(screen.getByText(/Working…/)).toBeTruthy();
		await act(async () => {
			fail(new Error('Missing prompt file'));
		});
		expect(screen.getByRole('alert').textContent).toContain(
			'Missing prompt file',
		);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Retry 🃏' }));
		});
		expect(runAction).toHaveBeenCalledTimes(2);
		await act(async () => {
			finish('Added 2 proposals');
		});
		expect(
			screen.getByRole('button', { name: 'Run 🃏' }).hasAttribute('disabled'),
		).toBe(false);
		expect(inbox.state.get().questions).toHaveLength(1);
		expect(inbox.state.get().actionRuns).toEqual([]);
		await act(async () => {
			await inbox.dispose();
		});
	});
});
