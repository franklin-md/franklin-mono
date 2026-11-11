// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDebugDump } from '../debug/dump.js';
import { DebugButton } from '../debug/button.js';
import { answeredQuestion } from '../capture/__tests__/question.js';
import type { ResearchEvidence } from '../evidence/types.js';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('question debug export', () => {
	it('copies the selected attempt, saved events and answer with credentials redacted', async () => {
		const question = answeredQuestion();
		question.state = {
			kind: 'failed',
			error: 'Authorization: Bearer private-debug-key',
		};
		const evidence: ResearchEvidence = {
			version: 1,
			question,
			ancestors: [],
			startedAt: 1,
			status: 'partial',
			missing: [],
			prompt: { text: 'Prompt', redacted: false, omittedCharacters: 0 },
			events: [],
			omittedEvents: 0,
			agentEvents: [
				{
					type: 'toolCall',
					at: 2,
					data: {
						text: 'return_answer',
						redacted: false,
						omittedCharacters: 0,
					},
				},
			],
			omittedAgentEvents: 0,
		};
		const load = vi.fn(async () => evidence);
		const writeText = vi.fn(async (_text: string) => {});
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		render(
			<DebugButton
				load={() =>
					createDebugDump(question, [], { load, save: async () => {} })
				}
				onError={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Copy agent events' }));
		await screen.findByRole('button', { name: 'Agent events copied' });
		expect(load).toHaveBeenCalledWith('q', 'q-accepted');
		const text = writeText.mock.calls[0]?.[0];
		if (!text) throw new Error('Expected copied debug text');
		expect(JSON.parse(text)).toMatchObject({
			question: { attemptId: 'q-accepted' },
		});
		expect(text).toContain('return_answer');
		expect(text).toContain('q-accepted');
		expect(text).toContain('[REDACTED');
		expect(text).not.toContain('private-debug-key');
	});

	it('explains missing historical events instead of claiming an empty trace is complete', async () => {
		const dump = await createDebugDump(answeredQuestion(), [], {
			load: async () => undefined,
			save: async () => {},
		});
		expect(dump).toContain('not recorded');
		expect(dump).toContain('Answer q.');
	});

	it('reports clipboard failures and allows another copy attempt', async () => {
		const error = new Error('Clipboard unavailable');
		const writeText = vi
			.fn()
			.mockRejectedValueOnce(error)
			.mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		const onError = vi.fn();
		render(<DebugButton load={async () => '{}'} onError={onError} />);
		fireEvent.click(screen.getByRole('button', { name: 'Copy agent events' }));
		await waitFor(() => expect(onError).toHaveBeenCalledWith(error));
		fireEvent.click(screen.getByRole('button', { name: 'Copy agent events' }));
		await screen.findByRole('button', { name: 'Agent events copied' });
		expect(writeText).toHaveBeenCalledTimes(2);
	});
});
