// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { answeredQuestion } from '../../capture/__tests__/question.js';
import { QuestionFeed } from '../feed.js';

afterEach(() => {
	document.getSelection()?.removeAllRanges();
	cleanup();
	vi.unstubAllGlobals();
});

describe('Inbox source row links', () => {
	it('opens the source from the note name, heading and row without expanding the quote or focusing the card', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		const link = screen.getByRole('link', { name: 'Open source note: Source' });
		expect(link.textContent).not.toContain('->');
		expect(link.getAttribute('href')).toBe('obsidian://open?file=Source.md');
		fireEvent.click(screen.getByText('Source'));
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(question.source);
		fireEvent.click(screen.getByText('/ Mechanism'));
		fireEvent.click(link);
		expect(onOpenSource).toHaveBeenCalledTimes(3);
		expect(screen.queryByRole('textbox')).toBeNull();
		const disclosure = screen.getByRole('button', { name: 'Captured quote' });
		expect(disclosure.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(disclosure);
		expect(screen.getByText('Original quote')).toBeTruthy();
		expect(disclosure.getAttribute('aria-expanded')).toBe('true');
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(onOpenSource).toHaveBeenCalledTimes(3);
		expect(screen.getAllByRole('link')).toHaveLength(1);
		fireEvent.click(link);
		expect(onOpenSource).toHaveBeenCalledTimes(4);
		expect(disclosure.getAttribute('aria-expanded')).toBe('true');
	});

	it('preserves the focused question and quote disclosure while navigating', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
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
		const disclosure = screen.getByRole('button', { name: 'Captured quote' });
		fireEvent.click(disclosure);
		fireEvent.click(screen.getByText('Original quote'));
		fireEvent.click(screen.getByText('Source'));
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(question.source);
		expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
			'Keep this draft',
		);
		expect(disclosure.getAttribute('aria-expanded')).toBe('true');
	});

	it('allows source-name text selection without navigating or focusing the card', () => {
		const question = answeredQuestion();
		const onOpenSource = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		const name = screen.getByText('Source');
		const range = document.createRange();
		range.selectNodeContents(name);
		document.getSelection()?.addRange(range);
		fireEvent.click(name);
		expect(onOpenSource).not.toHaveBeenCalled();
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(
			screen
				.getByRole('button', { name: 'Captured quote' })
				.getAttribute('aria-expanded'),
		).toBe('false');
	});

	it('keeps the whole source row available on follow-ups that inherit the original source', () => {
		const root = answeredQuestion('root');
		const child = {
			...answeredQuestion('child'),
			parentId: root.id,
			source: undefined,
		};
		const onOpenSource = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		render(
			<QuestionFeed
				questions={[root, child]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				onOpenSource={onOpenSource}
			/>,
		);
		const links = screen.getAllByRole('link', {
			name: 'Open source note: Source',
		});
		const childLink = links[1];
		if (!childLink) throw new Error('Expected the inherited source link');
		fireEvent.click(childLink);
		expect(onOpenSource).toHaveBeenCalledExactlyOnceWith(root.source);
		expect(screen.queryByRole('textbox')).toBeNull();
	});

	it.each(['location', 'callback'])(
		'omits the arrow when its %s is unavailable',
		(missing) => {
			const question = answeredQuestion();
			if (missing === 'location' && question.source)
				delete question.source.location;
			vi.stubGlobal(
				'matchMedia',
				vi.fn(() => ({ matches: true })),
			);
			render(
				<QuestionFeed
					questions={[question]}
					onFollowUp={vi.fn()}
					onDelete={vi.fn()}
					onRetry={vi.fn()}
					onOpenSource={missing === 'callback' ? undefined : vi.fn()}
				/>,
			);
			expect(screen.queryByRole('link')).toBeNull();
			fireEvent.click(screen.getByText('Captured quote'));
			expect(screen.getByText('Original quote')).toBeTruthy();
			expect(screen.queryByRole('textbox')).toBeNull();
		},
	);
});
