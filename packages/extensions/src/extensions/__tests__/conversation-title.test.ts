import { describe, it, expect, vi } from 'vitest';
import { apply } from '@franklin/lib/middleware';
import type { MiniACPAgent, ToolExecuteParams } from '@franklin/mini-acp';

import type {
	SystemPromptContent,
	SystemPromptHandler,
} from '../../modules/core/api/index.js';
import type { StoreRuntime } from '../../modules/store/runtime.js';
import { compileCoreWithStore } from '../../testing/compile-ext.js';
import { conversationTitleExtension } from '../conversation-title/extension.js';
import { conversationTitleKey } from '../conversation-title/key.js';
import { setChatTitleSpec } from '../conversation-title/tools.js';

type AgentStubOverrides = {
	[K in keyof MiniACPAgent]?: (...args: Parameters<MiniACPAgent[K]>) => any;
};

function stubAgent(overrides: AgentStubOverrides = {}): MiniACPAgent {
	return {
		toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'ok' }],
		})),
		...overrides,
	} as unknown as MiniACPAgent;
}

function getTitle(stores: StoreRuntime) {
	return stores.getStore(conversationTitleKey).get();
}

function compileConversationTitle() {
	return compileCoreWithStore(conversationTitleExtension());
}

async function renderConversationTitleSystemPrompt(): Promise<string> {
	const handlers: SystemPromptHandler[] = [];
	const api = {
		registerStore: vi.fn(),
		registerTool: vi.fn(),
		on(event: string, handler: SystemPromptHandler) {
			if (event === 'systemPrompt') handlers.push(handler);
		},
	};

	const extension = conversationTitleExtension();
	extension(api as unknown as Parameters<typeof extension>[0]);

	const parts: string[] = [];
	for (const handler of handlers) {
		let content: SystemPromptContent | undefined;
		await handler({
			setPart(part) {
				content = part;
			},
		});

		if (content === undefined) continue;
		parts.push(typeof content === 'function' ? await content() : content);
	}

	return parts.join('\n\n');
}

describe('conversationTitleExtension', () => {
	it('registers the conversation title store and title tool', async () => {
		const { stores, tools } = await compileConversationTitle();

		expect(getTitle(stores)).toBe('');
		expect(tools.map((tool) => tool.name)).toContain(setChatTitleSpec.name);
	});

	it('instructs agents to title new chats with the title tool', async () => {
		const prompt = await renderConversationTitleSystemPrompt();

		expect(prompt).toContain(setChatTitleSpec.name);
		expect(prompt).toContain('once per chat');
	});

	it('lets the agent set a trimmed chat title', async () => {
		const { middleware, stores } = await compileConversationTitle();
		const agent = stubAgent();
		const wrappedAgent = apply(middleware.server, agent);

		const result = await wrappedAgent.toolExecute({
			call: {
				type: 'toolCall',
				id: 'tc-title',
				name: setChatTitleSpec.name,
				arguments: { title: '  Project notes  ' },
			},
		});

		expect(result).toEqual({
			toolCallId: 'tc-title',
			content: [{ type: 'text', text: 'Title set to "Project notes"' }],
			isError: undefined,
		});
		expect(getTitle(stores)).toBe('Project notes');
	});

	it('rejects blank chat titles without changing the title store', async () => {
		const { middleware, stores } = await compileConversationTitle();
		const agent = stubAgent();
		const wrappedAgent = apply(middleware.server, agent);

		const result = await wrappedAgent.toolExecute({
			call: {
				type: 'toolCall',
				id: 'tc-title',
				name: setChatTitleSpec.name,
				arguments: { title: '   ' },
			},
		});

		expect(result.isError).toBe(true);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'Error: Conversation title cannot be empty',
		});
		expect(getTitle(stores)).toBe('');
	});
});
