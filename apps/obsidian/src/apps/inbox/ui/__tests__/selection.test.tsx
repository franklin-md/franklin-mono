// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuestionFeed } from '../feed.js';
import { answeredQuestion } from '../../capture/__tests__/question.js';
import { createGroup } from '../../hierarchy/create.js';

beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: true })));
afterEach(() => {
	document.getSelection()?.removeAllRanges();
	cleanup();
	vi.unstubAllGlobals();
});

function select(element: Element) {
	const range = document.createRange();
	range.selectNodeContents(element);
	const selection = document.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

function setup() {
	const group = createGroup({ title: 'Virtual memory' });
	const question = { ...answeredQuestion(), parentId: group.id };
	question.state = {
		kind: 'answered',
		answer: 'A direct answer.',
		details: [{ title: 'Mechanism', content: 'Supporting detail.' }],
	};
	render(
		<QuestionFeed
			questions={[question]}
			groups={[group]}
			onFollowUp={vi.fn()}
			onDelete={vi.fn()}
			onRetry={vi.fn()}
		/>,
	);
	const title = screen.getByRole('button', { name: question.text });
	const summary = screen.getByText('Virtual memory').closest('summary');
	const titleText = title.querySelector('span');
	const detail = screen.getByText('Mechanism').closest('details');
	if (!summary || !titleText || !detail)
		throw new Error('Expected title controls');
	const disclosure = summary.parentElement as HTMLDetailsElement;
	return { title, titleText, summary, disclosure, detail };
}

it('allows pointer title clicks when another part of the question or group is selected', () => {
	const h = setup();
	select(screen.getByText('A direct answer.'));
	fireEvent.click(h.title, { detail: 1 });
	expect(h.title.getAttribute('aria-expanded')).toBe('true');
	select(screen.getByText('A direct answer.'));
	fireEvent.click(h.title, { detail: 1 });
	expect(h.title.getAttribute('aria-expanded')).toBe('false');
	select(screen.getByText('A direct answer.'));
	fireEvent.click(h.summary, { detail: 1 });
	expect(h.disclosure.open).toBe(false);
});

it('preserves pointer text selection inside the clicked title', () => {
	const h = setup();
	select(h.titleText);
	fireEvent.click(h.titleText, { detail: 1 });
	expect(h.title.getAttribute('aria-expanded')).toBe('false');
	select(h.summary);
	fireEvent.click(h.summary, { detail: 1 });
	expect(h.disclosure.open).toBe(true);
});

it('allows keyboard activation even while the title itself is selected', () => {
	const h = setup();
	select(h.titleText);
	// Browsers synthesize a click with detail 0 for Enter/Space activation.
	fireEvent.click(h.title, { detail: 0 });
	expect(h.title.getAttribute('aria-expanded')).toBe('true');
	select(h.titleText);
	fireEvent.click(h.title, { detail: 0 });
	expect(h.title.getAttribute('aria-expanded')).toBe('false');
	select(h.summary);
	fireEvent.click(h.summary, { detail: 0 });
	expect(h.disclosure.open).toBe(false);
	select(h.summary);
	fireEvent.click(h.summary, { detail: 0 });
	expect(h.disclosure.open).toBe(true);
});

it('does not let the containing card block keyboard activation of detail headings', () => {
	const h = setup();
	const summary = screen.getByText('Mechanism');
	select(summary);
	fireEvent.click(summary, { detail: 0 });
	expect(h.detail.open).toBe(true);
	select(summary);
	fireEvent.click(summary, { detail: 0 });
	expect(h.detail.open).toBe(false);
});

it('allows pointer detail-heading clicks when other answer text is selected', () => {
	const h = setup();
	select(screen.getByText('A direct answer.'));
	fireEvent.click(screen.getByText('Mechanism'), { detail: 1 });
	expect(h.detail.open).toBe(true);
});
