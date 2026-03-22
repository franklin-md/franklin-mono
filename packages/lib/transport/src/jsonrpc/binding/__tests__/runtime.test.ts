import { describe, expect, it } from 'vitest';
import type { Duplex } from '../../../streams/types.js';
import type { JsonRpcMessage } from '../../types.js';
import { isResponse } from '../../types.js';
import { bindServer } from '../index.js';
import {
	defineManifest,
	type Protocol,
	request,
	notification,
} from '../../protocol/index.js';

interface ServerApi {
	add(params: { a: number; b: number }): Promise<number>;
	notify(params: { msg: string }): Promise<void>;
}

interface ClientApi {
	ping(params: { msg: string }): Promise<void>;
}

const manifest = defineManifest<ServerApi, ClientApi>({
	server: { add: request(), notify: notification() },
	client: { ping: notification() },
});

const serverHandlers: ServerApi = {
	async add({ a, b }) {
		return a + b;
	},
	async notify() {},
};

/**
 * Creates a server-side binding with a raw controller for injecting messages
 * and a collector for inspecting outgoing messages.
 */
function createServerWithRawWire(options?: {
	handlers?: Partial<ServerApi>;
	onError?: (error: unknown) => void;
}) {
	let injectController!: ReadableStreamDefaultController<JsonRpcMessage>;
	const outgoing: JsonRpcMessage[] = [];

	const readable = new ReadableStream<JsonRpcMessage>({
		start(c) {
			injectController = c;
		},
	});
	const writable = new WritableStream<JsonRpcMessage>({
		write(chunk) {
			outgoing.push(JSON.parse(JSON.stringify(chunk)) as JsonRpcMessage);
		},
	});

	const duplex: Duplex<JsonRpcMessage> = {
		readable,
		writable,
		close: async () => {
			try {
				injectController.close();
			} catch {
				/* already closed */
			}
		},
	};

	const server = bindServer({
		duplex: duplex as Protocol<ClientApi, ServerApi>,
		manifest,
		handlers: { ...serverHandlers, ...options?.handlers },
		onError: options?.onError,
	});

	return { server, inject: injectController, outgoing };
}

describe('unknown method handling', () => {
	it('unknown request receives -32601 error response', async () => {
		const { server, inject, outgoing } = createServerWithRawWire();

		inject.enqueue({
			jsonrpc: '2.0',
			id: 999,
			method: 'nonexistent',
			params: {},
		});

		await new Promise((r) => setTimeout(r, 50));

		const errorResponse = outgoing.find((m) => isResponse(m) && 'error' in m);
		expect(errorResponse).toMatchObject({
			jsonrpc: '2.0',
			id: 999,
			error: {
				code: -32601,
				message: 'Method not found: nonexistent',
			},
		});

		await server.close();
	});

	it('unknown notification is silently ignored', async () => {
		const { server, inject, outgoing } = createServerWithRawWire();

		inject.enqueue({
			jsonrpc: '2.0',
			method: 'unknownNotification',
			params: {},
		});

		await new Promise((r) => setTimeout(r, 50));

		expect(outgoing).toHaveLength(0);

		await server.close();
	});
});

describe('notification error handling', () => {
	it('notification handler error is reported via onError', async () => {
		const errors: unknown[] = [];
		const handlerError = new Error('notification handler boom');

		const { server, inject } = createServerWithRawWire({
			handlers: {
				async notify() {
					throw handlerError;
				},
			},
			onError: (err) => errors.push(err),
		});

		// Send a notification to the server's `notify` handler (which throws)
		inject.enqueue({
			jsonrpc: '2.0',
			method: 'notify',
			params: { msg: 'test' },
		});

		await new Promise((r) => setTimeout(r, 50));

		expect(errors).toHaveLength(1);
		expect(errors[0]).toBe(handlerError);

		await server.close();
	});

	it('notification handler error does not crash the connection', async () => {
		const { server, inject, outgoing } = createServerWithRawWire({
			handlers: {
				async notify() {
					throw new Error('boom');
				},
			},
			onError: () => {}, // suppress
		});

		// Send a notification that throws
		inject.enqueue({
			jsonrpc: '2.0',
			method: 'notify',
			params: { msg: 'will-throw' },
		});

		await new Promise((r) => setTimeout(r, 20));

		// Connection should still work — send a valid request
		inject.enqueue({
			jsonrpc: '2.0',
			id: 1,
			method: 'add',
			params: { a: 2, b: 3 },
		});

		await new Promise((r) => setTimeout(r, 50));

		const response = outgoing.find((m) => isResponse(m) && 'result' in m);
		expect(response).toMatchObject({
			jsonrpc: '2.0',
			id: 1,
			result: 5,
		});

		await server.close();
	});
});
