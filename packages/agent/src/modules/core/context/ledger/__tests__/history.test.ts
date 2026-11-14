import type { MiniACPClient } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { emptySessionSnapshot } from '../../../state.js';
import { SessionDraft } from '../../draft/session.js';
import { createContextLedger } from '../create.js';
import type { MessageEntry } from '../../../history/types.js';

describe('history synchronization', () => {
	it('retries a failed projection without replacing durable entries, even after an append', async () => {
		const entries: MessageEntry[] = [
			{
				type: 'message' as const,
				message: { role: 'user', content: [{ type: 'text', text: 'old' }] },
			},
			{
				type: 'message' as const,
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'retained' }],
				},
			},
		];
		const draft = SessionDraft.fromSnapshot({
			...emptySessionSnapshot(),
			entries,
		});
		const { ledger, recorder, getSentContext } = createContextLedger({ draft });
		const setContext = vi
			.fn<MiniACPClient['setContext']>()
			.mockResolvedValue(undefined);
		const client: MiniACPClient = {
			initialize: async () => {},
			setContext,
			async *prompt() {},
			async *continue() {},
			cancel: async () => {},
		};
		await ledger.sync(client);
		const checkpoint = {
			type: 'compaction' as const,
			summary: 'summary',
		};
		draft.appendCheckpoint(checkpoint);
		const apply = vi.spyOn(draft, 'apply');
		setContext.mockRejectedValueOnce(new Error('connection failed'));
		await expect(ledger.sync(client)).rejects.toThrow('connection failed');
		expect(draft.getEntries()).toEqual([...entries, checkpoint]);
		expect(getSentContext().messages).toEqual(
			entries.map((entry) => entry.message),
		);
		await ledger.sync(client);
		expect(setContext.mock.calls[2]).toEqual(setContext.mock.calls[1]);
		expect(draft.getEntries()).toEqual([...entries, checkpoint]);
		expect(apply).not.toHaveBeenCalled();

		draft.appendCheckpoint({
			...checkpoint,
			summary: 'new summary',
		});
		setContext.mockRejectedValueOnce(new Error('connection failed'));
		await expect(ledger.sync(client)).rejects.toThrow('connection failed');
		const response = {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'response' }],
		};
		recorder.append(response);
		await ledger.sync(client);
		expect(setContext.mock.calls.at(-1)?.[0]).toEqual({
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Conversation summary:\nnew summary' },
					],
				},
				response,
			],
		});
		expect(draft.getEntries()).toHaveLength(5);
		expect(draft.getEntries().slice(0, 2)).toEqual(entries);
		expect(getSentContext().messages).toEqual(draft.get().messages);
		expect(apply).not.toHaveBeenCalled();
	});
});
