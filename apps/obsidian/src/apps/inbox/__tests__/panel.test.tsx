// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxController } from '../controller/index.js';
import { InboxPanel } from '../ui/panel.js';
import { QuestionFeed } from '../ui/feed.js';
import type { StudyQuestion } from '../types.js';
import type { AnswerRequest, InboxDocument } from '../controller/types.js';
import { createInboxTestPersistence } from '../testing/persistence.js';

const defaults = {
	provider: 'openai-codex',
	model: 'gpt-6.1-sol',
	reasoning: 'low' as const,
};

afterEach(() => {
	document.getSelection()?.removeAllRanges();
	cleanup();
	vi.unstubAllGlobals();
});

describe('functional inbox UI', () => {
	it('renders saved questions, answers, model selection, and follow-ups through the controller', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		let saved: InboxDocument | undefined;
		const controller = await InboxController.create({
			defaults,
			persistence: {
				...createInboxTestPersistence().disk,
				inbox: {
					save: async (value) => {
						saved = structuredClone(value);
					},
					load: async () => ({ value: undefined, issues: [] }),
					delete: async () => {},
				},
			},
			run: async ({ submit }) => {
				await submit('Answer from the runtime.');
			},
		});
		const onError = vi.fn();
		const { unmount } = render(
			<InboxPanel
				controller={controller}
				captureContext={async () => ({
					note: 'Sleep',
					heading: 'Locking',
					quote: 'Captured context',
				})}
				onError={onError}
				onSettings={vi.fn()}
				onOpenSource={vi.fn()}
			/>,
		);
		fireEvent.change(screen.getByRole('textbox', { name: 'Ask a question' }), {
			target: { value: '- [ ] Why does it sleep?' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
		await screen.findByText('Answer from the runtime.');
		expect(screen.queryByRole('textbox', { name: /Follow up on:/ })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Why does it sleep?' }));
		expect(screen.getByRole('textbox', { name: /Follow up on:/ })).toBeTruthy();
		expect(saved?.questions[0]?.text).toBe('Why does it sleep?');
		expect(saved?.questions[0]?.source?.quote).toBe('Captured context');
		fireEvent.change(screen.getByRole('textbox', { name: /Follow up on:/ }), {
			target: { value: 'What if it wakes?' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Send follow-up' }));
		await screen.findByText('What if it wakes?');
		await waitFor(() =>
			expect(
				saved?.questions.filter((q) => q.state.kind === 'answered'),
			).toHaveLength(2),
		);
		expect(saved?.questions[0]?.parentId).toBe(saved?.questions[1]?.id);
		expect(onError).not.toHaveBeenCalled();
		unmount();
		await controller.dispose();
	});
	it('saves the composer mode to the Inbox settings and reports a failed save', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const { disk, read, readSettings } = createInboxTestPersistence();
		const controller = await InboxController.create({
			defaults,
			persistence: disk,
			run: vi.fn(),
		});
		const onError = vi.fn();
		render(
			<InboxPanel
				controller={controller}
				onError={onError}
				onSettings={vi.fn()}
				onOpenSource={vi.fn()}
			/>,
		);
		const toggle = () =>
			screen.getByRole('button', { name: 'Thought dump mode' });
		const written = read();
		await act(async () => {
			fireEvent.click(toggle());
		});
		expect(readSettings()?.mode).toBe('thought-dump');
		expect(toggle().getAttribute('aria-pressed')).toBe('true');
		expect(read()).toBe(written);
		vi.spyOn(disk.settings, 'save').mockRejectedValueOnce(
			new Error('Disk full'),
		);
		await act(async () => {
			fireEvent.click(toggle());
		});
		expect(onError).toHaveBeenCalledWith(new Error('Disk full'));
		expect(toggle().getAttribute('aria-pressed')).toBe('true');
		await controller.dispose();
	});
	it.each([
		{ stripChecklist: false, retrySaveFirst: false },
		{ stripChecklist: true, retrySaveFirst: false },
		{ stripChecklist: true, retrySaveFirst: true },
	])(
		'resending launches one run (strip checklist: $stripChecklist, Retry save first: $retrySaveFirst)',
		async ({ stripChecklist, retrySaveFirst }) => {
			vi.stubGlobal('matchMedia', () => ({ matches: true }));
			const { disk, read } = createInboxTestPersistence();
			const run = vi.fn(async ({ submit }: AnswerRequest) => {
				await submit('Recovered answer.');
			});
			const controller = await InboxController.create({
				defaults,
				persistence: disk,
				run,
			});
			vi.spyOn(disk.inbox, 'save').mockRejectedValueOnce(
				new Error('disk full'),
			);
			const captureContext = vi.fn(async () => undefined);
			const { unmount } = render(
				<InboxPanel
					controller={controller}
					captureContext={captureContext}
					onError={vi.fn()}
					onSettings={vi.fn()}
					onOpenSource={vi.fn()}
				/>,
			);
			const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Ask a question',
			});
			const send = () =>
				fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
			const initialDraft = '- [ ] Keep this question';
			fireEvent.change(input, { target: { value: initialDraft } });
			await act(async () => {
				send();
			});
			const originalId = controller.state.get().questions[0]?.id;
			expect(input.value).toBe(initialDraft);
			expect(run).not.toHaveBeenCalled();
			if (retrySaveFirst) {
				fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
				await screen.findByText('Recovered answer.');
			}
			if (stripChecklist)
				fireEvent.change(input, { target: { value: 'Keep this question' } });
			await act(async () => {
				send();
			});
			await screen.findByText('Recovered answer.');
			expect(read()?.questions.map((question) => question.id)).toEqual([
				originalId,
			]);
			expect(read()?.questions[0]?.text).toBe('Keep this question');
			expect(run).toHaveBeenCalledOnce();
			expect(captureContext).toHaveBeenCalledOnce();
			expect(input.value).toBe('');
			unmount();
			await controller.dispose();
		},
	);
});

describe('focused inbox question', () => {
	it('toggles one full answer and composer, preserves drafts, and leaves selection and links alone', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const questions: StudyQuestion[] = ['one', 'two'].map((id) => ({
			id,
			text: `Question ${id}`,
			createdAt: 1,
			model: 'test',
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			state: { kind: 'answered', answer: `Answer ${id}\n\n[Source](#source)` },
		}));
		render(
			<QuestionFeed
				questions={questions}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
			/>,
		);
		const one = screen.getByRole('article', { name: 'Question one' });
		const two = screen.getByRole('article', { name: 'Question two' });
		expect(screen.queryByRole('textbox')).toBeNull();
		expect(
			screen.queryByRole('button', { name: /Expand|Less|Follow up/ }),
		).toBeNull();
		fireEvent.click(within(one).getByRole('button', { name: 'Question one' }));
		const draft = screen.getByRole('textbox', {
			name: 'Follow up on: Question one',
		});
		fireEvent.change(draft, { target: { value: 'Keep my draft' } });
		expect(one.querySelector('.study-answer-expanded')).not.toBeNull();
		expect(screen.getAllByRole('textbox')).toHaveLength(1);
		fireEvent.click(within(one).getByText('Answer one'));
		expect(one.querySelector('.study-answer-expanded')).toBeNull();
		expect(
			within(one)
				.getByRole('button', { name: 'Question one' })
				.getAttribute('aria-expanded'),
		).toBe('false');
		expect(screen.queryByRole('textbox')).toBeNull();
		fireEvent.click(within(one).getByText('Answer one'));
		expect(one.querySelector('.study-answer-expanded')).not.toBeNull();
		expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
			'Keep my draft',
		);
		fireEvent.click(within(two).getByRole('link'));
		expect(
			within(one)
				.getByRole('button', { name: 'Question one' })
				.getAttribute('aria-expanded'),
		).toBe('true');
		const selection = document.getSelection();
		if (!selection) throw new Error('Expected document selection');
		const range = document.createRange();
		range.selectNodeContents(within(two).getByText('Answer two'));
		selection.addRange(range);
		fireEvent.click(within(two).getByText('Answer two'), { detail: 1 });
		expect(one.querySelector('.study-answer-expanded')).not.toBeNull();
		selection.removeAllRanges();
		fireEvent.click(within(two).getByText('Answer two'));
		expect(one.querySelector('.study-answer-expanded')).toBeNull();
		expect(two.querySelector('.study-answer-expanded')).not.toBeNull();
		expect(screen.getAllByRole('textbox')).toHaveLength(1);
		fireEvent.click(within(one).getByRole('button', { name: 'Question one' }));
		expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(
			'Keep my draft',
		);
		fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
		expect(screen.queryByRole('textbox')).toBeNull();
	});
});

describe('question headers', () => {
	it('shows the agent header, preserves the exact original, and uses the header for follow-ups', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const original = '- [ ] Machine mode?\n\t- [ ] Supervisor/Hypervisor?';
		const title = 'What are machine, supervisor and hypervisor modes?';
		const question: StudyQuestion = {
			id: 'modes',
			text: original,
			createdAt: 1,
			model: 'test',
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			state: {
				kind: 'answered',
				title,
				answer: 'They are processor privilege modes.',
			},
		};
		const { container } = render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
			/>,
		);
		const header = screen.getByRole('button', { name: title });
		expect(header.querySelector('span')?.textContent).toBe(title);
		expect(
			container.querySelector('.study-original')?.closest('footer')?.hidden,
		).toBe(true);
		fireEvent.click(header);
		expect(
			container.querySelector('.study-original')?.closest('footer')?.hidden,
		).toBe(false);
		expect(container.querySelector('.study-original p')?.textContent).toBe(
			original,
		);
		expect(
			screen.getByRole('textbox', { name: `Follow up on: ${title}` }),
		).toBeTruthy();
		expect(question.text).toBe(original);
	});
	it('cleans checklist markers in older saved questions without inventing a header', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const question: StudyQuestion = {
			id: 'old',
			text: '- [ ] Machine mode?\n\t- [ ] Supervisor/Hypervisor?',
			createdAt: 1,
			model: 'test',
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			state: { kind: 'answered', answer: 'Existing answer.' },
		};
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole('button', {
				name: 'Machine mode? Supervisor/Hypervisor?',
			}),
		).toBeTruthy();
	});
});
