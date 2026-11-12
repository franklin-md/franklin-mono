import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { captureSetup, cardSnapshot } from '../../capture/__tests__/setup.js';
import { answeredQuestion } from '../../capture/__tests__/question.js';
import { CaptureController } from '../../capture/controller.js';
import { createGroup } from '../create.js';
import { branchContext } from '../context.js';
import { questionPrompt } from '../../agent/prompt.js';
import { ResearchRecorder } from '../../evidence/recorder.js';

it('pins only each question’s ancestor groups in research and retains group context after capture restore', async () => {
	const h = await captureSetup();
	const outer = createGroup({ title: 'VM', context: 'Original dump' });
	const parent = {
		...answeredQuestion('parent'),
		parentId: outer.id,
		rootId: outer.id,
	};
	const inner = createGroup({ context: 'Child-only context' }, parent);
	const child = {
		...answeredQuestion('child'),
		parentId: inner.id,
		rootId: outer.id,
	};
	let restored: CaptureController | undefined;
	try {
		for (const question of [parent, child]) {
			const request = {
				question,
				...branchContext(question, {
					questions: [parent, child],
					groups: [outer, inner],
				}),
				signal: new AbortController().signal,
				submit: async () => {},
			};
			const recorder = new ResearchRecorder(
				request,
				questionPrompt(request),
				h.evidence,
			);
			recorder.setSystemPrompt('Study prompt');
			await recorder.accept();
		}
		outer.folded = true;
		await h.capture.start(child, [parent], [outer, inner]);
		outer.context = 'Changed after Record';
		const pending = h.capture.state.get().pending!;
		expect(pending.groups?.[0]?.context).toBe('Original dump');
		expect(pending.research[0]?.prompt.text).toContain('Child-only context');
		expect(pending.research[1]?.prompt.text).not.toContain(
			'Child-only context',
		);
		expect(pending.research[1]?.prompt.text).toContain('Original dump');
		expect(pending.research.every((entry) => entry.status === 'complete')).toBe(
			true,
		);
		await h.capture.dispose();
		restored = await CaptureController.create(h.options);
		expect(restored.state.get().pending?.groups).toEqual(pending.groups);
		h.readCards.mockResolvedValue(cardSnapshot('card'));
		await restored.stop();
		const saved = await readFile(
			join(h.root, pending.folder, `${pending.id}.json`),
			'utf8',
		);
		expect(saved).toContain('Original dump');
		expect(saved).toContain('Child-only context');
		expect(saved).not.toContain('Changed after Record');
	} finally {
		await h.capture.dispose();
		await restored?.dispose();
		await rm(h.root, { recursive: true, force: true });
	}
});
