import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
} from '@agentclientprotocol/sdk';
import {
	AgentSideConnection as AgentSideConnectionImpl,
	PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';
import type { AgentStack } from '../stack.js';
import { compose, sequence } from '../stack.js';
import { createMemoryTransport } from '../transport/in-memory.js';
import { createModuleMiddleware } from '../middleware/modules/middleware.js';
import { createMockAgent } from './helpers.js';

import type { FranklinModule } from '../middleware/modules/types.js';

function setup(modules: FranklinModule[], handler: Partial<AgentStack>) {
	const { transport, agentStream } = createMemoryTransport();
	const mockAgent = createMockAgent();

	void new AgentSideConnectionImpl((conn) => {
		mockAgent.conn = conn;
		return {
			initialize: (p) => mockAgent.initialize(p),
			newSession: (p) => mockAgent.newSession(p),
			prompt: (p) => mockAgent.prompt(p),
			cancel: (p) => mockAgent.cancel(p),
			authenticate: (p) => mockAgent.authenticate(p),
		};
	}, agentStream);

	const middlewares = modules.map((m) => createModuleMiddleware(m));
	const middleware =
		middlewares.length === 1 ? middlewares[0]! : sequence(middlewares);
	const connection = new AgentConnection(transport);
	const stack = compose(connection, middleware, handler);

	return { stack, mockAgent };
}

const defaultHandler: Partial<AgentStack> = {
	sessionUpdate: async () => {},
	requestPermission: async () => ({
		outcome: { outcome: 'selected' as const, optionId: 'allow' },
	}),
};

describe('createModuleMiddleware', () => {
	const stacks: AgentStack[] = [];

	function tracked(modules: FranklinModule[]) {
		const result = setup(modules, defaultHandler);
		stacks.push(result.stack);
		return result;
	}

	afterEach(async () => {
		while (stacks.length > 0) {
			const s = stacks.pop();
			if (s) await s.dispose();
		}
	});

	it('onCreate injects MCP servers into newSession', async () => {
		const capturedMcpServers: unknown[] = [];

		const mod: FranklinModule = {
			name: 'test-mod',
			async onCreate() {
				return {
					mcpServers: [
						{
							name: 'test-mcp',
							command: '/bin/echo',
							args: [],
							env: [],
						},
					],
				};
			},
		};

		const { stack, mockAgent } = tracked([mod]);

		mockAgent.newSession = vi.fn<
			(p: NewSessionRequest) => Promise<NewSessionResponse>
		>(async (params) => {
			capturedMcpServers.push(...params.mcpServers);
			return { sessionId: 'test-session' };
		});

		await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await stack.newSession({ cwd: '/test', mcpServers: [] });

		expect(capturedMcpServers).toHaveLength(1);
		expect(capturedMcpServers[0]).toMatchObject({
			name: 'test-mcp',
			command: '/bin/echo',
		});
	});

	it('system prompt is prepended to the first prompt only', async () => {
		const capturedPrompts: PromptRequest[] = [];

		const mod: FranklinModule = {
			name: 'sys-prompt-mod',
			async onCreate(ctx) {
				ctx.systemPrompt.append('You are a helpful assistant.');
				return {};
			},
		};

		const { stack, mockAgent } = tracked([mod]);

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedPrompts.push(params);
				return { stopReason: 'end_turn' as const };
			},
		);

		await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await stack.newSession({ cwd: '/test', mcpServers: [] });

		// First prompt — should have system prompt prepended
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(capturedPrompts).toHaveLength(1);
		const firstBlocks = capturedPrompts[0]!.prompt;
		expect(firstBlocks).toHaveLength(2);
		expect(firstBlocks[0]).toMatchObject({
			type: 'text',
			text: 'You are a helpful assistant.',
		});
		expect(firstBlocks[1]).toMatchObject({
			type: 'text',
			text: 'hello',
		});

		// Second prompt — no system prompt
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'world' }],
		});

		expect(capturedPrompts).toHaveLength(2);
		const secondBlocks = capturedPrompts[1]!.prompt;
		expect(secondBlocks).toHaveLength(1);
		expect(secondBlocks[0]).toMatchObject({
			type: 'text',
			text: 'world',
		});
	});

	it('onPrompt runs per-prompt and can modify content', async () => {
		const mod: FranklinModule = {
			name: 'tag-mod',
			onPrompt(ctx) {
				return {
					...ctx,
					prompt: [{ type: 'text' as const, text: '[TAGGED]' }, ...ctx.prompt],
				};
			},
		};

		const capturedPrompts: PromptRequest[] = [];
		const { stack, mockAgent } = tracked([mod]);

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedPrompts.push(params);
				return { stopReason: 'end_turn' as const };
			},
		);

		await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await stack.newSession({ cwd: '/test', mcpServers: [] });

		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'world' }],
		});

		// Both prompts should have [TAGGED] prepended
		expect(capturedPrompts).toHaveLength(2);
		for (const req of capturedPrompts) {
			expect(req.prompt[0]).toMatchObject({ type: 'text', text: '[TAGGED]' });
		}
	});

	it('onDispose runs on dispose', async () => {
		const disposeLog: string[] = [];

		const mod: FranklinModule = {
			name: 'disposable-mod',
			async onDispose() {
				disposeLog.push('disposed');
			},
		};

		const { stack } = setup([mod], defaultHandler);

		await stack.dispose();

		expect(disposeLog).toEqual(['disposed']);
	});

	it('multiple modules compose via sequence — MCP servers merge, system prompts join', async () => {
		const capturedMcpServers: unknown[] = [];
		const capturedPrompts: PromptRequest[] = [];

		const modA: FranklinModule = {
			name: 'mod-a',
			async onCreate(ctx) {
				ctx.systemPrompt.append('Prompt A.');
				return {
					mcpServers: [{ name: 'mcp-a', command: '/a', args: [], env: [] }],
				};
			},
		};

		const modB: FranklinModule = {
			name: 'mod-b',
			async onCreate(ctx) {
				ctx.systemPrompt.append('Prompt B.');
				return {
					mcpServers: [{ name: 'mcp-b', command: '/b', args: [], env: [] }],
				};
			},
		};

		const { stack, mockAgent } = setup([modA, modB], defaultHandler);
		stacks.push(stack);

		mockAgent.newSession = vi.fn<
			(p: NewSessionRequest) => Promise<NewSessionResponse>
		>(async (params) => {
			capturedMcpServers.push(...params.mcpServers);
			return { sessionId: 'test-session' };
		});

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedPrompts.push(params);
				return { stopReason: 'end_turn' as const };
			},
		);

		await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await stack.newSession({ cwd: '/test', mcpServers: [] });

		// Both MCP servers should be injected
		expect(capturedMcpServers).toHaveLength(2);
		expect(capturedMcpServers[0]).toMatchObject({ name: 'mcp-a' });
		expect(capturedMcpServers[1]).toMatchObject({ name: 'mcp-b' });

		// First prompt should have both system prompts joined
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hi' }],
		});

		const blocks = capturedPrompts[0]!.prompt;
		expect(blocks[0]).toMatchObject({
			type: 'text',
			text: 'Prompt A.\n\nPrompt B.',
		});
	});

	it('no system prompt block when no module uses the builder', async () => {
		const capturedPrompts: PromptRequest[] = [];

		const mod: FranklinModule = {
			name: 'no-prompt-mod',
			async onCreate() {
				return {};
			},
		};

		const { stack, mockAgent } = tracked([mod]);

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedPrompts.push(params);
				return { stopReason: 'end_turn' as const };
			},
		);

		await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await stack.newSession({ cwd: '/test', mcpServers: [] });

		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]!.prompt).toHaveLength(1);
		expect(capturedPrompts[0]!.prompt[0]).toMatchObject({
			type: 'text',
			text: 'hello',
		});
	});
});
