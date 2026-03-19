import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionNotification } from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

import {
	createAgentConnection,
	fillHandler,
	joinCommands,
	joinEvents,
	TodoExtension,
} from '@franklin/agent';
import type { AgentConnection, Middleware } from '@franklin/agent';

import { createDefaultRegistry } from '../registry.js';
import { NodeFramework } from '../framework.js';

// ---------------------------------------------------------------------------
// Skip guard — only runs when codex-acp is available
// ---------------------------------------------------------------------------

function isCodexAvailable(): boolean {
	return spawnSync('which', ['npx'], { stdio: 'ignore' }).status === 0;
}

const describeIntegration = isCodexAvailable() ? describe : describe.skip;

// ---------------------------------------------------------------------------
// MCP tool integration test
// ---------------------------------------------------------------------------

describeIntegration('MCP tool integration (codex + TodoExtension)', () => {
	let rawConnection: AgentConnection | undefined;
	let middleware: Middleware | undefined;

	afterEach(async () => {
		await middleware?.dispose?.();
		middleware = undefined;
		await rawConnection?.dispose();
		rawConnection = undefined;
	});

	it('agent calls a tool registered via extension and updates store', async () => {
		// 1. Set up framework and compile TodoExtension into middleware.
		//    compileExtensions creates an HTTP relay server that serves the
		//    extension's tools (add_todo, complete_todo, list_todos).
		const framework = new NodeFramework(createDefaultRegistry());
		const env = framework.provision();
		const transport = await env.spawn('claude-acp');

		const todoExtension = new TodoExtension();
		middleware = await framework.compileExtensions([todoExtension]);

		// 3. Wire the connection through middleware with custom event handlers.
		//    - sessionUpdate: captures all agent updates for inspection
		//    - requestPermission: auto-approves (codex uses on-request policy)
		const updates: SessionNotification[] = [];
		const handler = fillHandler({
			sessionUpdate: vi.fn(async (notification: SessionNotification) => {
				updates.push(notification);
			}),
			requestPermission: vi.fn(async () => ({
				outcome: {
					outcome: 'selected' as const,
					optionId: 'allow',
				},
			})),
		});

		const wrappedHandler = joinEvents(middleware, handler);
		rawConnection = createAgentConnection(transport, wrappedHandler);
		const commands = joinCommands(middleware, rawConnection.commands);

		// 4. Initialize ACP protocol handshake.
		const initResponse = await commands.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		expect(initResponse.protocolVersion).toBe(PROTOCOL_VERSION);

		// 5. Create session — the extension middleware injects the tool
		//    relay MCP server config into mcpServers so the agent can
		//    discover and call the registered tools.
		const { sessionId } = await commands.newSession({
			cwd: process.cwd(),
			mcpServers: [],
		});
		expect(sessionId).toBeDefined();

		// 6. Prompt the agent to call the add_todo tool.
		const promptResponse = await commands.prompt({
			sessionId,
			prompt: [
				{
					type: 'text',
					text: 'Use the add_todo tool to add a todo with the text "buy milk". Just call the tool, nothing else.',
				},
			],
		});

		expect(promptResponse.stopReason).toBeDefined();

		// 7. Verify the tool was executed — the TodoExtension store should
		//    have been updated by the tool handler, proving the full
		//    round-trip: agent → relay subprocess → HTTP callback →
		//    serve() → tool.execute() → store.
		const todos = todoExtension.state.get();
		expect(todos.length).toBeGreaterThan(0);
		expect(todos[0]!.text).toMatch(/buy milk/i);
	}, 60_000);
});
