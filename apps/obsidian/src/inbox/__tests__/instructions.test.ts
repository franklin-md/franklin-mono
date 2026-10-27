import { describe, expect, it, vi } from 'vitest';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxController } from '../controller/controller.js';
import { inboxCodec } from '../controller/schema.js';

function legacyData(terse: boolean) {
	const base = {
		provider: 'test',
		model: 'test',
		reasoning: 'off',
		createdAt: 1,
		updatedAt: 1,
		state: { kind: 'answered', answer: 'Saved answer' },
	};
	const root = {
		...base,
		id: 'root',
		rootId: 'root',
		attemptId: 'root-attempt',
		text: 'Root question',
		terse: false,
	};
	const child = {
		...base,
		id: 'child',
		rootId: 'root',
		parentId: 'root',
		attemptId: 'child-attempt',
		text: 'Follow-up question',
		terse: true,
	};
	const action = { id: 'cards', name: 'Cards', prompt: 'Create cards.' };
	return {
		questions: [child, root],
		preferences: {
			provider: 'test',
			model: 'test',
			reasoning: 'off',
			concurrency: 3,
			terse,
		},
		actions: [action],
		actionRuns: [
			{
				id: 'run',
				attemptId: 'action-attempt',
				action,
				question: child,
				ancestors: [root],
				provider: 'test',
				model: 'action-model',
				reasoning: 'off',
				createdAt: 2,
				state: { kind: 'failed', error: 'Try again' },
			},
		],
	};
}

describe('saved inbox answer instructions', () => {
	it.each([1, 2])(
		'migrates version %i preferences and question snapshots',
		(version) => {
			for (const terse of [true, false]) {
				const data = legacyData(terse);
				const decoded = inboxCodec.decode({ version, data });
				if (!decoded.ok) throw new Error(JSON.stringify(decoded.issue));
				const value = decoded.value;
				expect(value.preferences.answerInstructions).toBe(
					terse
						? value.questions[0]!.answerInstructions
						: DEFAULT_ANSWER_INSTRUCTIONS,
				);
				expect(value.questions[0]?.answerInstructions).toBe(
					'Prefer 1–3 short sentences or a few short bullets. No introductions, restatements, or closing offers. Use more words when correctness requires them.',
				);
				expect(value.questions[1]?.answerInstructions).toBe(
					DEFAULT_ANSWER_INSTRUCTIONS,
				);
				expect(value.questions[0]?.state).toEqual(data.questions[0]?.state);
				expect(value.actions).toEqual(version === 2 ? data.actions : []);
				expect(
					value.actionRuns.map((run) => ({
						instructions: run.question.answerInstructions,
						ancestors: run.ancestors.map((q) => q.answerInstructions),
					})),
				).toEqual(
					version === 2
						? [
								{
									instructions: value.questions[0]?.answerInstructions,
									ancestors: [DEFAULT_ANSWER_INSTRUCTIONS],
								},
							]
						: [],
				);
				const encoded = inboxCodec.encode(value);
				expect(encoded).toMatchObject({ version: 3 });
				expect(JSON.stringify(encoded)).not.toContain('"terse"');
				data.questions[1] = { ...data.questions[1]!, rootId: 'missing-root' };
				expect(inboxCodec.decode({ version, data }).ok).toBe(false);
			}
		},
	);

	it('persists exact custom text and permits an empty replacement across restarts', async () => {
		const persistence = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/inbox.json'),
			inboxCodec,
		);
		const options = {
			defaults: { provider: 'test', model: 'test', reasoning: 'off' as const },
			persistence,
			run: vi.fn(),
		};
		const inbox = await InboxController.create(options);
		expect(inbox.state.get().preferences.answerInstructions).toBe(
			DEFAULT_ANSWER_INSTRUCTIONS,
		);
		const answerInstructions =
			'  Explain step by step.\nUse `swtch` as an example.  ';
		await inbox.configure({ answerInstructions });
		await inbox.dispose();
		const restored = await InboxController.create(options);
		expect(restored.state.get().preferences.answerInstructions).toBe(
			answerInstructions,
		);
		await restored.configure({ answerInstructions: '' });
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe('');
		await restored.dispose();
	});
});
