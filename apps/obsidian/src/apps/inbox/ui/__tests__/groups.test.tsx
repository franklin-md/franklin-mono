// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuestionFeed } from '../feed.js';
import { answeredQuestion } from '../../capture/__tests__/question.js';
import type { InboxGroup } from '../../hierarchy/types.js';

beforeEach(() => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
	);
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it('folds the entire group and retains drafts and disclosures', async () => {
	const group: InboxGroup = {
		kind: 'group',
		id: 'group',
		rootId: 'group',
		createdAt: 1,
		folded: false,
		title: 'Virtual memory',
		context: 'Original dump',
	};
	const question = { ...answeredQuestion('one'), parentId: group.id };
	question.state = {
		kind: 'answered',
		answer: 'Answer',
		details: [{ title: 'Mechanism', content: 'Detail text' }],
	};
	const child = { ...answeredQuestion('child'), parentId: question.id };
	const props = {
		questions: [question, child],
		groups: [group],
		onFollowUp: vi.fn(),
		onDelete: vi.fn(),
		onRetry: vi.fn(),
		onFoldGroup: vi.fn(),
	};
	const { container, rerender } = render(<QuestionFeed {...props} />);
	const summary = screen.getByText('Virtual memory').closest('summary');
	if (!summary) throw new Error('Expected a group fold header');
	const disclosure = summary.parentElement as HTMLDetailsElement;
	fireEvent.click(screen.getByRole('button', { name: question.text }));
	fireEvent.change(screen.getByRole('textbox'), {
		target: { value: 'Keep my draft' },
	});
	const detail = screen.getByText('Mechanism').closest('details');
	if (!detail) throw new Error('Expected an answer disclosure');
	detail.open = true;
	fireEvent.click(summary);
	await waitFor(() =>
		expect(props.onFoldGroup).toHaveBeenCalledWith(group.id, true),
	);
	expect(disclosure.open).toBe(false);
	expect(container.querySelectorAll('article')).toHaveLength(2);
	rerender(<QuestionFeed {...props} groups={[{ ...group, folded: true }]} />);
	rerender(<QuestionFeed {...props} />);
	expect(disclosure.open).toBe(true);
	expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
		'Keep my draft',
	);
	expect(detail.open).toBe(true);
	expect(screen.queryByText('Original dump')).toBeNull();
	expect(screen.queryByText('Group context')).toBeNull();
	expect(summary.querySelector('[aria-label="2 questions"]')).toBeTruthy();
});

it('reveals folded ancestors before navigating to a question, including repeated requests', async () => {
	const group: InboxGroup = {
		kind: 'group',
		id: 'group',
		rootId: 'group',
		createdAt: 1,
		folded: true,
	};
	const nested = { ...group, id: 'nested', parentId: group.id };
	const question = { ...answeredQuestion(), parentId: nested.id };
	const onFoldGroup = vi.fn();
	const props = {
		questions: [question],
		groups: [group, nested],
		onFoldGroup,
		onFollowUp: vi.fn(),
		onDelete: vi.fn(),
		onRetry: vi.fn(),
	};
	const { rerender } = render(
		<QuestionFeed
			{...props}
			navigation={{ questionId: question.id, requestId: '1' }}
		/>,
	);
	const title = screen.getByRole('button', { name: question.text });
	expect(document.activeElement).toBe(title);
	expect(title.getAttribute('aria-expanded')).toBe('true');
	await waitFor(() =>
		expect(onFoldGroup).toHaveBeenCalledWith(group.id, false),
	);
	expect(onFoldGroup).toHaveBeenCalledWith(nested.id, false);
	fireEvent.keyDown(title, { key: 'Escape' });
	rerender(
		<QuestionFeed
			{...props}
			navigation={{ questionId: question.id, requestId: '2' }}
		/>,
	);
	expect(title.getAttribute('aria-expanded')).toBe('true');
});

it('renders siblings in creation order across node kinds when timestamps tie', () => {
	const root: InboxGroup = {
		kind: 'group',
		id: 'root',
		rootId: 'root',
		createdAt: 1,
		folded: false,
	};
	const first = { ...answeredQuestion('first'), parentId: root.id, order: 2 };
	const last = { ...answeredQuestion('last'), parentId: root.id, order: 4 };
	const middle = {
		...root,
		id: 'middle',
		parentId: root.id,
		title: 'Middle',
		order: 3,
	};
	const { container } = render(
		<QuestionFeed
			questions={[last, first]}
			groups={[middle, root]}
			onFollowUp={vi.fn()}
			onDelete={vi.fn()}
			onRetry={vi.fn()}
		/>,
	);
	expect(
		[...container.querySelectorAll('article, summary')]
			.filter(
				(element) =>
					element.matches('article') ||
					element.textContent.startsWith('Middle'),
			)
			.map((element) =>
				element.textContent.includes('Question first?')
					? 'first'
					: element.textContent.includes('Question last?')
						? 'last'
						: 'middle',
			),
	).toEqual(['first', 'middle', 'last']);
});

it('gives older untitled groups a saved AI heading without exposing or changing their context', () => {
	const group: InboxGroup = {
		kind: 'group',
		id: 'old',
		rootId: 'old',
		createdAt: 1,
		folded: false,
		context: 'Long original thought dump that should stay out of the feed',
	};
	const question = {
		...answeredQuestion('old-question'),
		parentId: group.id,
		state: {
			kind: 'answered' as const,
			title: 'How do hardware timers work?',
			answer: 'A saved answer',
		},
	};
	const props = {
		questions: [question],
		groups: [group],
		onFollowUp: vi.fn(),
		onDelete: vi.fn(),
		onRetry: vi.fn(),
	};
	const { container, rerender } = render(<QuestionFeed {...props} />);
	const summary = container.querySelector('.study-group > summary');
	expect(summary?.textContent).toContain('How do hardware timers work?');
	expect(summary?.querySelector('[aria-label="1 question"]')).toBeTruthy();
	expect(
		screen.queryByText(
			'Long original thought dump that should stay out of the feed',
		),
	).toBeNull();
	expect(group.title).toBeUndefined();
	rerender(
		<QuestionFeed
			{...props}
			groups={[{ ...group, title: 'Timer virtualization' }]}
		/>,
	);
	expect(summary?.textContent).toContain('Timer virtualization');
	expect(summary?.textContent).not.toContain('How do hardware timers work?');
});

it.each([false, true])(
	'deletes a group from its header without toggling it (folded: %s)',
	async (folded) => {
		const group: InboxGroup = {
			kind: 'group',
			id: 'group',
			rootId: 'group',
			createdAt: 1,
			folded,
			title: 'Virtual memory',
		};
		const nested = {
			...group,
			id: 'nested',
			parentId: group.id,
			title: 'Address spaces',
		};
		const onDelete = vi.fn();
		const onFoldGroup = vi.fn();
		render(
			<QuestionFeed
				questions={[]}
				groups={[group, nested]}
				onFollowUp={vi.fn()}
				onRetry={vi.fn()}
				onDelete={onDelete}
				onFoldGroup={onFoldGroup}
			/>,
		);
		const summary = screen.getByText('Virtual memory').closest('summary');
		if (!summary) throw new Error('Expected the group header');
		const disclosure = summary.parentElement as HTMLDetailsElement;
		await waitFor(() => expect(disclosure.open).toBe(!folded));
		const button = screen.getByRole('button', {
			name: 'Delete group: Virtual memory',
		});
		fireEvent.click(button);
		expect(onDelete).toHaveBeenCalledExactlyOnceWith(group.id);
		expect(disclosure.open).toBe(!folded);
		expect(onFoldGroup).not.toHaveBeenCalled();
		if (!folded) {
			onDelete.mockClear();
			fireEvent.click(
				screen.getByRole('button', { name: 'Delete group: Address spaces' }),
			);
			expect(onDelete).toHaveBeenCalledExactlyOnceWith(nested.id);
			expect(disclosure.open).toBe(true);
			expect(onFoldGroup).not.toHaveBeenCalled();
		}
	},
);
