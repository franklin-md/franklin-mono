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
import { QuestionFeed } from '../feed.js';

beforeEach(() => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
	);
});

afterEach(() => {
	document.getSelection()?.removeAllRanges();
	cleanup();
	vi.unstubAllGlobals();
});

describe('Inbox source row links', () => {
	it('shows the source only when selected and opens it from the note name, heading and row without collapsing the card', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		expect(screen.queryByRole('link')).toBeNull();
		const title = screen.getByRole('button', { name: question.text });
		fireEvent.click(title);
		const link = screen.getByRole('link', { name: 'Open source note: Source' });
		expect(link.textContent).not.toContain('->');
		expect(link.getAttribute('href')).toBe('obsidian://open?file=Source.md');
		fireEvent.click(screen.getByText('Source'));
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(question.source);
		fireEvent.click(screen.getByText('/ Mechanism'));
		fireEvent.click(link);
		expect(onOpenSource).toHaveBeenCalledTimes(3);
		expect(title.getAttribute('aria-expanded')).toBe('true');
		expect(screen.queryByText('Captured quote')).toBeNull();
		expect(screen.queryByText('Original quote')).toBeNull();
	});

	it('preserves the focused question and follow-up draft while navigating', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: question.text }));
		const draft = screen.getByRole<HTMLTextAreaElement>('textbox');
		fireEvent.change(draft, { target: { value: 'Keep this draft' } });
		fireEvent.click(screen.getByText('Source'));
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(question.source);
		expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
			'Keep this draft',
		);
	});

	it('allows source-name text selection without navigating or collapsing the card', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		const title = screen.getByRole('button', { name: question.text });
		fireEvent.click(title);
		const name = screen.getByText('Source');
		const range = document.createRange();
		range.selectNodeContents(name);
		document.getSelection()?.addRange(range);
		fireEvent.click(name);
		expect(onOpenSource).not.toHaveBeenCalled();
		expect(title.getAttribute('aria-expanded')).toBe('true');
	});

	it('keeps the whole source row available on follow-ups that inherit the original source', () => {
		const root = answeredQuestion('root');
		const child = {
			...answeredQuestion('child'),
			parentId: root.id,
			source: undefined,
		};
		const onOpenSource = vi.fn();
		render(
			<QuestionFeed
				questions={[root, child]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		const card = screen.getByRole('article', { name: child.text });
		fireEvent.click(within(card).getByRole('button', { name: child.text }));
		const link = screen.getByRole('link', { name: 'Open source note: Source' });
		expect(card.contains(link)).toBe(true);
		fireEvent.click(link);
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(root.source);
	});

	it.each(['location', 'callback'])(
		'omits the arrow when its %s is unavailable',
		(missing) => {
			const question = answeredQuestion();
			if (missing === 'location' && question.source)
				delete question.source.location;
			render(
				<QuestionFeed
					questions={[question]}
					onFollowUp={vi.fn()}
					onDelete={vi.fn()}
					onRetry={vi.fn()}
					onOpenSource={missing === 'callback' ? undefined : vi.fn()}
				/>,
			);
			fireEvent.click(screen.getByRole('button', { name: question.text }));
			expect(screen.queryByRole('link')).toBeNull();
			expect(screen.getByText('Source')).toBeTruthy();
			expect(screen.queryByText('Original quote')).toBeNull();
		},
	);
});
