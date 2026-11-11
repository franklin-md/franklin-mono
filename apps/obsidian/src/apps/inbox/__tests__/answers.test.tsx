// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAnswer } from '../answer/format.js';
import { questionPrompt } from '../agent/prompt.js';
import { InboxController } from '../controller/controller.js';
import { inboxCodec } from '../controller/schema.js';
import { answeredQuestion } from '../capture/__tests__/question.js';
import { QuestionFeed } from '../ui/feed.js';
import type { AnswerRequest, InboxDocument } from '../controller/types.js';

const firstDetail = {
	title: 'Why retries are unsafe',
	content: 'The payment may already have succeeded.',
};
const secondDetail = {
	title: 'How keys help',
	content: 'The same key identifies the same operation.',
};
const details = [firstDetail, secondDetail];

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('structured inbox answers', () => {
	it('selects the containing question when opening or reading details and keeps it selected while closing them', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const question = answeredQuestion();
		question.state = { kind: 'answered', answer: 'No.', details };
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				renderAnswer={(text) => <p>{text}</p>}
			/>,
		);
		expect(screen.getByText('No.')).toBeTruthy();
		const first = screen.getByText(firstDetail.title).closest('details');
		const second = screen.getByText(secondDetail.title).closest('details');
		if (!first || !second)
			throw new Error('Expected native detail disclosures');
		expect(first.open).toBe(false);
		expect(second.open).toBe(false);
		fireEvent.click(within(first).getByText(firstDetail.title));
		expect(first.open).toBe(true);
		expect(second.open).toBe(false);
		expect(screen.getByRole('textbox')).toBeTruthy();
		fireEvent.click(within(first).getByText(firstDetail.content));
		expect(first.open).toBe(true);
		expect(screen.getByRole('textbox')).toBeTruthy();
		fireEvent.click(within(second).getByText(secondDetail.title));
		expect(first.open).toBe(true);
		expect(second.open).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: question.text }));
		expect(screen.queryByRole('textbox')).toBeNull();
		fireEvent.click(within(first).getByText(firstDetail.content));
		expect(screen.getByRole('textbox')).toBeTruthy();
		expect(first.open).toBe(true);
		fireEvent.click(within(first).getByText(firstDetail.title));
		expect(first.open).toBe(false);
		expect(second.open).toBe(true);
		expect(screen.getByRole('textbox')).toBeTruthy();
	});

	it('leaves detail links and selected title or section text alone', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const question = answeredQuestion();
		question.state = { kind: 'answered', answer: 'No.', details };
		render(
			<QuestionFeed
				questions={[question]}
				onFollowUp={vi.fn()}
				onDelete={vi.fn()}
				onRetry={vi.fn()}
				renderAnswer={(text) => (
					<p>
						{text}
						<a href="#reference">Reference</a>
					</p>
				)}
			/>,
		);
		const section = screen.getByText(firstDetail.title).closest('details');
		const title = screen
			.getByRole('button', { name: question.text })
			.querySelector('span');
		const selection = document.getSelection();
		if (!section || !title || !selection)
			throw new Error('Expected selectable title and details');
		section.open = true;
		fireEvent.click(within(section).getByRole('link'));
		expect(screen.queryByRole('textbox')).toBeNull();
		for (const text of [title, screen.getByText(firstDetail.title)]) {
			const range = document.createRange();
			range.selectNodeContents(text);
			selection.removeAllRanges();
			selection.addRange(range);
			fireEvent.click(text);
			expect(screen.queryByRole('textbox')).toBeNull();
		}
		selection.removeAllRanges();
	});

	it.each([undefined, []])(
		'renders an answer without empty disclosures (%j)',
		(sections) => {
			vi.stubGlobal(
				'matchMedia',
				vi.fn(() => ({ matches: true })),
			);
			const question = answeredQuestion();
			question.state = {
				kind: 'answered',
				answer: 'Saved answer.',
				...(sections ? { details: sections } : {}),
			};
			const { container } = render(
				<QuestionFeed
					questions={[question]}
					onFollowUp={vi.fn()}
					onDelete={vi.fn()}
					onRetry={vi.fn()}
				/>,
			);
			expect(screen.getByText('Saved answer.')).toBeTruthy();
			expect(container.querySelector('details')).toBeNull();
		},
	);

	it('includes every detail in follow-up context while preserving legacy answers', () => {
		const parent = answeredQuestion('parent');
		parent.state = { kind: 'answered', answer: 'No.', details };
		const prompt = questionPrompt({
			question: answeredQuestion(),
			ancestors: [parent],
		});
		for (const section of details) {
			expect(prompt).toContain(section.title);
			expect(prompt).toContain(section.content);
		}
		expect(
			formatAnswer({ kind: 'answered', answer: 'Legacy **Markdown**.' }),
		).toBe('Legacy **Markdown**.');
	});

	it('persists sections across restarts and in action and ancestor snapshots, migrating v3 answers intact', async () => {
		let saved: InboxDocument | undefined;
		const options = {
			defaults: { provider: 'test', model: 'test', reasoning: 'off' as const },
			persistence: {
				load: async () => ({ value: saved, issues: [] }),
				save: async (value: InboxDocument) => {
					const decoded = inboxCodec.decode(inboxCodec.encode(value));
					if (!decoded.ok) throw new Error(JSON.stringify(decoded.issue));
					saved = decoded.value;
				},
				delete: async () => {},
			},
			run: async ({ submit }: AnswerRequest) => {
				await submit('No.', 'Is retrying safe?', details);
			},
		};
		const inbox = await InboxController.create(options);
		const root = await inbox.add('Is retrying safe?');
		await vi.waitFor(() =>
			expect(saved?.questions[0]?.state.kind).toBe('answered'),
		);
		const child = await inbox.add('Why?', root);
		await vi.waitFor(() =>
			expect(saved?.questions.every((q) => q.state.kind === 'answered')).toBe(
				true,
			),
		);
		await inbox.actions.save({
			id: 'cards',
			name: 'Cards',
			prompt: 'Create cards.',
		});
		await inbox.actions.start(child, 'cards');
		await vi.waitFor(() =>
			expect(saved?.actionRuns[0]?.state.kind).toBe('failed'),
		);
		await inbox.dispose();
		const restored = await InboxController.create(options);
		expect(restored.state.get().questions[0]?.state).toMatchObject({
			answer: 'No.',
			details,
		});
		expect(restored.state.get().actionRuns[0]?.question.state).toMatchObject({
			details,
		});
		expect(
			restored.state.get().actionRuns[0]?.ancestors[0]?.state,
		).toMatchObject({ details });
		const previous = structuredClone(restored.state.get());
		for (const question of previous.questions) {
			if (question.state.kind === 'answered') delete question.state.details;
		}
		const migrated = inboxCodec.decode({ version: 3, data: previous });
		expect(migrated.ok && migrated.value.questions[0]?.state).toEqual({
			kind: 'answered',
			answer: 'No.',
			title: 'Is retrying safe?',
		});
		expect(inboxCodec.encode(restored.state.get())).toMatchObject({
			version: 6,
		});
		await restored.dispose();
	});
});
