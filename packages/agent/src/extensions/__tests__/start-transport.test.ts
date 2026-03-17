import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { McpToolStream, McpTransport } from '@franklin/local-mcp';
import {
	bridge,
	type BridgeRequest,
	type BridgeResponse,
} from '@franklin/transport';

import type { ExtensionToolDefinition } from '../types/index.js';
import { startTransport } from '../compile/start.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolCall = { tool: string; arguments: unknown };

/**
 * Creates an in-memory transport factory and a bridge (caller side)
 * so tests can send tool calls and verify responses end-to-end.
 */
function createTestTransport() {
	const { handler: call, duplex: callerDuplex } = bridge<ToolCall, unknown>();

	// Two TransformStreams form the channel between caller and server
	const toServer = new TransformStream<BridgeRequest<ToolCall>>();
	const toClient = new TransformStream<BridgeResponse<unknown>>();

	// Wire caller ↔ server via the transform streams
	void callerDuplex.readable.pipeTo(toServer.writable);
	void toClient.readable.pipeTo(callerDuplex.writable);

	const toolStream: McpToolStream = {
		readable: toServer.readable,
		writable: toClient.writable,
		close: async () => {},
	};

	const stubConfig = {
		name: 'test-relay',
		command: 'node',
		args: ['--version'],
		env: [] as Array<{ name: string; value: string }>,
	};

	return {
		transport: {
			config: stubConfig,
			stream: toolStream,
			dispose: async () => {},
		},
		call,
		close: async () => {
			await callerDuplex.close();
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startTransport', () => {
	it('dispatches tool calls to the correct execute handler', async () => {
		const { transport, call, close } = createTestTransport();

		const tools: ExtensionToolDefinition[] = [
			{
				name: 'greet',
				description: 'Returns a greeting',
				schema: z.object({ name: z.string() }),
				execute: async (params: { name: string }) => `Hello, ${params.name}!`,
			},
		];

		await startTransport('test-ext', tools, transport);

		const result = await call({ tool: 'greet', arguments: { name: 'World' } });
		expect(result).toBe('Hello, World!');

		await close();
	});

	it('returns error for unknown tools', async () => {
		const { transport, call, close } = createTestTransport();

		const tools: ExtensionToolDefinition[] = [
			{
				name: 'known',
				description: 'A known tool',
				schema: z.object({}),
				execute: async () => 'ok',
			},
		];

		await startTransport('my-ext', tools, transport);

		await expect(call({ tool: 'unknown_tool', arguments: {} })).rejects.toThrow(
			'[my-ext] Unknown tool: unknown_tool',
		);

		await close();
	});

	it('throws if factory returns a stream with a pre-locked writable', async () => {
		const serverStream: McpToolStream = {
			readable: new ReadableStream(),
			writable: new WritableStream(),
			close: async () => {},
		};

		// Simulate a buggy factory that pre-locks the writable
		// (reproduces the old createIpcMcpTransport bug where serve()
		// was called inside the factory, locking the writable before
		// startTransport could call serve() itself)
		serverStream.writable.getWriter();

		const transport: McpTransport = {
			config: { name: 'test', command: 'node', args: [], env: [] },
			stream: serverStream,
			dispose: async () => {},
		};

		const tools: ExtensionToolDefinition[] = [
			{
				name: 'tool',
				description: 'test',
				schema: z.object({}),
				execute: async () => 'ok',
			},
		];

		await expect(
			startTransport('test-ext', tools, transport),
		).rejects.toThrow();
	});
});
