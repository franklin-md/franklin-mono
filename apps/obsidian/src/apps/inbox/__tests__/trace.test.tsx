// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../controller/index.js';
import { InboxPanel } from '../ui/panel.js';
import { createInboxTestPersistence } from '../testing/persistence.js';
import { testAction, upsertAction } from '../testing/action.js';
import type { AnswerRequest } from '../controller/types.js';

const defaults = {
	provider: 'openai-codex',
	model: 'gpt-6.1-sol',
	reasoning: 'low' as const,
};

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

async function answeredInbox(
	traces?: Map<string, unknown>,
	setup?: (controller: InboxController) => Promise<void>,
) {
	vi.stubGlobal('matchMedia', () => ({ matches: true }));
	const controller = await InboxController.create({
		defaults,
		traces,
		persistence: createInboxTestPersistence().disk,
		run: async ({ submit, onTrace }: AnswerRequest) => {
			await submit('Answer from the runtime.');
			onTrace?.({ core: { systemPrompt: 'Inbox research prompt' } });
		},
	});
	await setup?.(controller);
	const onError = vi.fn();
	render(
		<InboxPanel
			controller={controller}
			onError={onError}
			onSettings={vi.fn()}
			onOpenSource={vi.fn()}
		/>,
	);
	fireEvent.change(screen.getByRole('textbox', { name: 'Ask a question' }), {
		target: { value: 'Why does it sleep?' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
	await screen.findByText('Answer from the runtime.');
	fireEvent.click(screen.getByRole('button', { name: 'Why does it sleep?' }));
	return { controller, onError };
}

describe('Inbox agent trace', () => {
	it('copies the agent trace of a question from its card', async () => {
		const writeText = vi.fn(async (_text: string) => {});
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		const { controller, onError } = await answeredInbox(new Map());
		fireEvent.click(screen.getByRole('button', { name: 'Copy inspect dump' }));
		await screen.findByRole('button', { name: 'Inspect dump copied' });
		expect(JSON.parse(writeText.mock.calls[0]?.[0] ?? '')).toEqual({
			core: { systemPrompt: 'Inbox research prompt' },
		});
		expect(onError).not.toHaveBeenCalled();
		await controller.dispose();
	});

	it('keeps actions and the trace button in one wrapping row', async () => {
		const { controller } = await answeredInbox(new Map(), async (inbox) => {
			await inbox.settings.configure(({ actions }) => ({
				actions: upsertAction(testAction('cards', 'Flashcard', 'Create cards'))(
					actions,
				),
			}));
		});
		const action = screen.getByRole('button', { name: 'Run Flashcard' });
		const trace = screen.getByRole('button', { name: 'Copy inspect dump' });
		expect(action.parentElement?.parentElement).toBe(trace.parentElement);
		await controller.dispose();
	});

	it('offers no trace button when traces are not kept', async () => {
		const { controller } = await answeredInbox();
		expect(screen.queryByRole('button', { name: 'Copy inspect dump' })).toBe(
			null,
		);
		await controller.dispose();
	});
});
