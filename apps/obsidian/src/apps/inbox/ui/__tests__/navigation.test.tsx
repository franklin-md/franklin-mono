// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QuestionFeed } from '../feed.js';
import { answeredQuestion } from '../../capture/__tests__/question.js';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
it('selects, expands, scrolls and focuses the requested card on mount and on repeated navigation', () => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
	);
	const scroll = vi.fn();
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		configurable: true,
		value: scroll,
	});
	const one = answeredQuestion('one');
	const two = answeredQuestion('two');
	const props = {
		questions: [one, two],
		onFollowUp: vi.fn(),
		onDelete: vi.fn(),
		onRetry: vi.fn(),
	};
	const { rerender } = render(
		<QuestionFeed
			{...props}
			navigation={{ questionId: two.id, requestId: '1' }}
		/>,
	);
	const card = screen.getByRole('article', { name: two.text });
	const title = within(card).getByRole('button', { name: two.text });
	expect(title.getAttribute('aria-expanded')).toBe('true');
	expect(document.activeElement).toBe(title);
	expect(scroll).toHaveBeenCalled();
	fireEvent.keyDown(title, { key: 'Escape' });
	expect(title.getAttribute('aria-expanded')).toBe('false');
	rerender(
		<QuestionFeed
			{...props}
			navigation={{ questionId: two.id, requestId: '2' }}
		/>,
	);
	expect(title.getAttribute('aria-expanded')).toBe('true');
});
