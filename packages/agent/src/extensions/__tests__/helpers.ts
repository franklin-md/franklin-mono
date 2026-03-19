import { vi } from 'vitest';

import type { AnyMessage } from '@agentclientprotocol/sdk';

import type { McpToolStream, McpTransport } from '@franklin/local-mcp';
import { createDuplexPair, type Duplex } from '@franklin/transport';

import type { AgentTransport } from '../../transport/index.js';
import type { McpTransportFactory } from '../compile/index.js';

// ---------------------------------------------------------------------------
// Transport pair
// ---------------------------------------------------------------------------

/**
 * Creates a connected pair of AgentTransports for testing middleware.
 *
 * `agent` represents the raw agent endpoint — middleware wraps this.
 * `app` is only available after applying middleware: `const app = middleware(agent)`.
 * The test can write into the returned app transport and read from `other`
 * (or vice versa) to verify transformations.
 */
export function createTransportPair(): {
	a: Duplex<AnyMessage>;
	b: Duplex<AnyMessage>;
} {
	return createDuplexPair<AnyMessage>();
}

// ---------------------------------------------------------------------------
// sendCommand — write a JSON-RPC request and read what the other side gets
// ---------------------------------------------------------------------------

/**
 * Sends a JSON-RPC request through `from`'s writable and reads
 * the first message that arrives on `to`'s readable.
 */
export async function sendCommand(
	from: AgentTransport,
	to: AgentTransport,
	method: string,
	params: unknown,
): Promise<AnyMessage> {
	const writer = from.writable.getWriter();
	await writer.write({
		jsonrpc: '2.0',
		id: 1,
		method,
		params,
	} as AnyMessage);
	writer.releaseLock();

	await new Promise((r) => setTimeout(r, 10));
	const reader = to.readable.getReader();
	const { value } = await reader.read();
	reader.releaseLock();
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return value!;
}

/**
 * Sends a JSON-RPC notification (no `id`) through `from`'s writable and reads
 * the first message that arrives on `to`'s readable.
 *
 * The reader is acquired before writing to avoid missing the forwarded message.
 */
export async function sendNotification(
	from: AgentTransport,
	to: AgentTransport,
	method: string,
	params: unknown,
): Promise<AnyMessage> {
	const reader = to.readable.getReader();
	const writer = from.writable.getWriter();
	await writer.write({ jsonrpc: '2.0', method, params } as AnyMessage);
	writer.releaseLock();
	const { value } = await reader.read();
	reader.releaseLock();
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return value!;
}

// ---------------------------------------------------------------------------
// Mock MCP transport factory
// ---------------------------------------------------------------------------

export const stubMcpConfig = {
	name: 'test-relay',
	command: 'node',
	args: ['--version'],
	env: [{ name: 'STUB', value: 'true' }],
};

export function createMockTransportFactory(): {
	factory: McpTransportFactory;
	getTransport: () => McpTransport | undefined;
} {
	let transport: McpTransport | undefined;
	const factory: McpTransportFactory = async (_name) => {
		const mockStream = {
			readable: new ReadableStream<never>(),
			writable: new WritableStream<never>(),
			close: async () => {},
		} as unknown as McpToolStream;

		transport = {
			config: stubMcpConfig,
			stream: mockStream,
			dispose: vi.fn(async () => {}),
		};
		return transport;
	};
	return { factory, getTransport: () => transport };
}
