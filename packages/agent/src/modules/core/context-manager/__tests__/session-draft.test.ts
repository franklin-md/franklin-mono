import type { ToolDefinition, UserMessage } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it } from 'vitest';
import { emptyToolFilter } from '../../state.js';
import { SessionDraft } from '../session-draft.js';

const userMessage: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'seed' }],
};

const lookupTool = {
	name: 'lookup',
	description: 'Lookup a value',
	inputSchema: { type: 'object', properties: {} },
} satisfies ToolDefinition;

describe('SessionDraft', () => {
	it('commits snapshot state plus drafter-produced runtime context', async () => {
		const draft = SessionDraft.fromSnapshot({
			messages: [userMessage],
			llmConfig: { model: 'test-model' },
			usage: ZERO_USAGE,
			toolFilter: emptyToolFilter(),
		});
		draft.addDrafter((context) => {
			context.setSystemPrompt('system', 'system-prompt:1');
			context.setTools([lookupTool], 'tools:1');
		});

		const commit = await draft.commit();

		expect(commit.context).toEqual({
			systemPrompt: 'system',
			messages: [userMessage],
			tools: [lookupTool],
			config: { model: 'test-model' },
		});
	});

	it('keeps drafter output out of the durable draft', async () => {
		const draft = SessionDraft.fromSnapshot({
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: emptyToolFilter(),
		});
		draft.addDrafter((context) => {
			context.setSystemPrompt('runtime only', 'system-prompt:1');
			context.setTools([lookupTool], 'tools:1');
		});

		await draft.commit();

		expect(draft.get()).toEqual({
			systemPrompt: '',
			messages: [],
			tools: [],
			config: {},
		});
	});
});
