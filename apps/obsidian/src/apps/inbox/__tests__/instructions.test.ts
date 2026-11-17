import { describe, expect, it, vi } from 'vitest';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxController } from '../controller/index.js';
import { inboxCodec } from '../controller/schema.js';

const legacyDefaultInstructions =
	'Give a focused explanation with a small example when useful.';

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
	return {
		questions: [child, root],
		preferences: {
			provider: 'test',
			model: 'test',
			reasoning: 'off',
			concurrency: 3,
			terse,
		},
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
						: legacyDefaultInstructions,
				);
				expect(value.questions[0]?.answerInstructions).toBe(
					'Prefer 1–3 short sentences or a few short bullets. No introductions, restatements, or closing offers. Use more words when correctness requires them.',
				);
				expect(value.questions[1]?.answerInstructions).toBe(
					legacyDefaultInstructions,
				);
				expect(value.questions[0]?.state).toEqual(data.questions[0]?.state);
				const encoded = inboxCodec.encode(value);
				expect(encoded).toMatchObject({ version: 7 });
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
