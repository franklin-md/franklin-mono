// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answeredQuestion } from '../../capture/__tests__/question.js';
import type { QuestionState } from '../../types.js';
import { QuestionFeed } from '../feed.js';

beforeEach(() => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('Inbox card sections', () => {
	it('keeps the header and answer visible and shows info and controls only for the selected card', () => {
		const question = answeredQuestion('one');
		question.state = {
			kind: 'answered',
			title: 'Short title',
			answer: 'Direct answer.',
			details: [],
		};
		const other = answeredQuestion('two');
		const onDelete = vi.fn();
		const onAction = vi.fn();
		render(
			<QuestionFeed
				questions={[question, other]}
				onFollowUp={vi.fn()}
				onDelete={onDelete}
				onRetry={vi.fn()}
				onOpenSource={vi.fn()}
				renderActions={() => <button onClick={onAction}>Action</button>}
			/>,
		);
		const card = screen.getByRole('article', { name: 'Short title' });
		const title = within(card).getByRole('button', { name: 'Short title' });
		const footer = card.querySelector('footer');
		expect(card.querySelector('header')?.contains(title)).toBe(true);
		expect(
			within(card).getByText('Direct answer.').closest('footer'),
		).toBeNull();
		expect(footer?.hidden).toBe(true);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Action' })).toBeNull();
		expect(screen.queryByText('Captured quote')).toBeNull();
		expect(screen.queryByText('Original quote')).toBeNull();
		fireEvent.click(title);
		expect(footer?.hidden).toBe(false);
		expect(title.getAttribute('aria-controls')).toBe(footer?.id);
		expect(footer?.contains(screen.getByText('Original question'))).toBe(true);
		fireEvent.click(screen.getByText('Original question'));
		expect(screen.getByText(question.text).textContent).toBe(question.text);
		fireEvent.click(screen.getByText(question.text));
		expect(title.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(screen.getByRole('button', { name: 'Action' }));
		expect(onAction).toHaveBeenCalledOnce();
		expect(footer?.hidden).toBe(false);
		const draft = screen.getByRole<HTMLTextAreaElement>('textbox');
		fireEvent.change(draft, { target: { value: 'Keep this follow-up' } });
		fireEvent.click(screen.getByRole('button', { name: other.text }));
		expect(footer?.hidden).toBe(true);
		expect(screen.getAllByRole('button', { name: 'Action' })).toHaveLength(1);
		fireEvent.click(title);
		expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
			'Keep this follow-up',
		);
		fireEvent.keyDown(draft, { key: 'Escape' });
		expect(footer?.hidden).toBe(true);
		expect(within(card).getByText('Direct answer.')).toBeTruthy();
		fireEvent.click(
			within(card).getByRole('button', {
				name: 'Delete question: Short title',
			}),
		);
		expect(onDelete).toHaveBeenCalledExactlyOnceWith(question.id);
	});

	it.each<QuestionState>([
		{ kind: 'queued' },
		{ kind: 'running' },
		{ kind: 'failed', error: 'Provider unavailable' },
	])('allows selecting a $kind card to reveal its footer', (state) => {
		const question = { ...answeredQuestion(), state };
		const onRetry = vi.fn();
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={onRetry}
				onOpenSource={vi.fn()}
			/>,
		);
		const title = screen.getByRole<HTMLButtonElement>('button', {
			name: question.text,
		});
		expect(title.disabled).toBe(false);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
		fireEvent.click(title);
		expect(
			screen.getByRole('link', { name: 'Open source note: Source' }),
		).toBeTruthy();
		expect(screen.queryByRole('textbox')).toBeNull();
		if (state.kind === 'failed') {
			fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
			expect(onRetry).toHaveBeenCalledExactlyOnceWith(question.id);
			expect(title.getAttribute('aria-expanded')).toBe('true');
		}
		fireEvent.click(title);
		expect(screen.queryByRole('link')).toBeNull();
	});
});
