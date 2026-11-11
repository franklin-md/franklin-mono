// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxQuestionPill } from '../pill.js';
import { createInboxDirectiveScenario } from '../testing/scenario.js';

let scenario: Awaited<ReturnType<typeof createInboxDirectiveScenario>>;
let questionId: string;

beforeEach(async () => {
	scenario = await createInboxDirectiveScenario();
	questionId = await scenario.inbox.add('Why does this work?');
	await vi.waitFor(() => expect(scenario.requests).toHaveLength(1));
	const request = scenario.requests[0];
	if (!request) throw new Error('Expected an active question');
	await request.submit('A **composable** answer.', undefined, [
		{ title: 'More detail', content: 'Read [the note](obsidian://open).' },
	]);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	vi.useFakeTimers();
});

afterEach(async () => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	await scenario.service.dispose();
	await scenario.inbox.dispose();
	await scenario.registry.dispose();
});

function mountPill() {
	const mounted = render(
		<>
			<input aria-label="Note editor" />
			<InboxQuestionPill
				state={{ questionId }}
				inbox={scenario.inbox}
				onOpen={scenario.open}
				onError={scenario.error}
			/>
		</>,
	);
	return {
		...mounted,
		pill: screen.getByRole('button', { name: 'View answer in Inbox' }),
	};
}

async function advance(ms = 500) {
	await act(async () => {
		vi.advanceTimersByTime(ms);
	});
}

describe('Inbox answer preview', () => {
	it('shows the question in its header and opens that question in Inbox for follow-ups', async () => {
		const { pill } = mountPill();
		act(() => pill.focus());
		expect(
			screen.getByRole('heading', { name: 'Why does this work?' }),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole('button', { name: 'Open question in Inbox' }),
		);
		await advance();
		expect(scenario.open).toHaveBeenCalledExactlyOnceWith(questionId);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('quick-deletes the question and its follow-ups and removes every copied pill after saving', async () => {
		await scenario.inbox.add('A follow-up question', questionId);
		const instance = await scenario.service.definition.create({ questionId });
		scenario.content = `Question ${instance.text}\nCopy ${instance.text}`;
		const { pill } = mountPill();
		act(() => pill.focus());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));
		});
		await advance();
		expect(scenario.inbox.state.get().questions).toHaveLength(0);
		expect(scenario.content).toBe('Question \nCopy ');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(scenario.open).not.toHaveBeenCalled();
	});

	it('reports a failed delete save and keeps persisted note references for retry', async () => {
		const instance = await scenario.service.definition.create({ questionId });
		scenario.content = instance.text;
		const { pill } = mountPill();
		act(() => pill.focus());
		const error = new Error('disk full');
		vi.spyOn(scenario.persistence, 'save').mockRejectedValueOnce(error);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));
		});
		expect(scenario.error).toHaveBeenCalledExactlyOnceWith(error);
		expect(scenario.content).toBe(instance.text);
	});

	it('opens after hovering, renders Markdown and expandable details, and leaves editor focus alone', async () => {
		const { pill } = mountPill();
		const editor = screen.getByRole('textbox');
		act(() => editor.focus());
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		await advance(100);
		expect(screen.queryByRole('dialog')).toBeNull();
		await advance();
		const preview = screen.getByRole('dialog', { name: 'Answer preview' });
		expect(preview.textContent).toContain('A composable answer.');
		expect(preview.textContent).not.toContain('**');
		expect(document.activeElement).toBe(editor);
		fireEvent.click(screen.getByText('More detail'));
		expect(preview.querySelector('details')?.open).toBe(true);
		expect(
			screen.getByRole('link', { name: 'the note' }).getAttribute('href'),
		).toBe('obsidian://open');
		expect(pill.getAttribute('title')).toBeNull();
	});

	it('cancels a brief hover and cancels a pending opening on unmount', async () => {
		const { pill, unmount } = mountPill();
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		fireEvent.pointerLeave(pill, { pointerType: 'mouse' });
		await advance();
		expect(screen.queryByRole('dialog')).toBeNull();
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		unmount();
		await advance();
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('allows crossing the gap into the bubble and closes after leaving both surfaces', async () => {
		const { pill } = mountPill();
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		await advance();
		const preview = screen.getByRole('dialog');
		fireEvent.pointerLeave(pill, { pointerType: 'mouse' });
		await advance(50);
		fireEvent.pointerEnter(preview, { pointerType: 'mouse' });
		await advance(1000);
		expect(screen.getByRole('dialog')).toBe(preview);
		fireEvent.pointerLeave(preview, { pointerType: 'mouse' });
		await advance();
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('opens on focus, stays open for focused content, and dismisses with Escape', async () => {
		const { pill } = mountPill();
		act(() => pill.focus());
		const preview = screen.getByRole('dialog');
		expect(document.activeElement).toBe(pill);
		fireEvent.keyDown(pill, { key: 'Tab' });
		expect(preview.contains(document.activeElement)).toBe(true);
		fireEvent.click(screen.getByText('More detail'));
		const link = screen.getByRole('link', { name: 'the note' });
		act(() => link.focus());
		fireEvent.pointerLeave(preview, { pointerType: 'mouse' });
		await advance();
		expect(screen.getByRole('dialog')).toBe(preview);
		fireEvent.keyDown(link, { key: 'Escape' });
		await advance();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(pill);
	});

	it('preserves clicking to open the exact Inbox question and dismisses the preview', async () => {
		const { pill } = mountPill();
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		await advance();
		fireEvent.click(pill);
		await advance();
		expect(scenario.open).toHaveBeenCalledExactlyOnceWith(questionId);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('keeps focus on the editor when dismissed outside and removes an open preview with its question', async () => {
		const { pill } = mountPill();
		act(() => pill.focus());
		const editor = screen.getByRole('textbox');
		act(() => editor.focus());
		await advance();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(editor);
		fireEvent.pointerEnter(pill, { pointerType: 'mouse' });
		await advance();
		expect(screen.queryByRole('dialog')).not.toBeNull();
		await act(() => scenario.inbox.remove(questionId));
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
