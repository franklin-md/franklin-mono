import { describe, expect, it } from 'vitest';
import { method, notification, event, namespace } from '@franklin/lib';
import type { Duplex } from '../../streams/types.js';

import type { JsonRpcMessage } from '../types.js';
import {
	isNotification,
	isRequest,
	isResponse,
	isStreamCancelNotification,
	isStreamUpdateNotification,
} from '../types.js';
import { RpcError } from '../errors.js';
import { bindClient, bindServer } from '../binding/index.js';

function createUnlockedPair<T>(): {
	a: Duplex<T>;
	b: Duplex<T>;
	close: () => Promise<void>;
} {
	let controllerA!: ReadableStreamDefaultController<T>;
	let controllerB!: ReadableStreamDefaultController<T>;

	const readableA = new ReadableStream<T>({
		start(c) {
			controllerA = c;
		},
	});
	const readableB = new ReadableStream<T>({
		start(c) {
			controllerB = c;
		},
	});

	const writableA = new WritableStream<T>({
		write(chunk) {
			controllerB.enqueue(chunk);
		},
	});
	const writableB = new WritableStream<T>({
		write(chunk) {
			controllerA.enqueue(chunk);
		},
	});

	const a: Duplex<T> = {
		readable: readableA,
		writable: writableA,
		dispose: async () => {
			try {
				controllerA.close();
			} catch {
				/* already closed */
			}
		},
	};
	const b: Duplex<T> = {
		readable: readableB,
		writable: writableB,
		dispose: async () => {
			try {
				controllerB.close();
			} catch {
				/* already closed */
			}
		},
	};

	return {
		a,
		b,
		close: async () => {
			await a.dispose();
			await b.dispose();
		},
	};
}

describe('type guards', () => {
	it('isRequest: has method + id', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'foo',
			params: {},
		};
		expect(isRequest(msg)).toBe(true);
		expect(isNotification(msg)).toBe(false);
		expect(isResponse(msg)).toBe(false);
	});

	it('isNotification: has method, no id', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: 'foo',
			params: {},
		};
		expect(isNotification(msg)).toBe(true);
		expect(isRequest(msg)).toBe(false);
		expect(isResponse(msg)).toBe(false);
	});

	it('isResponse (success): has id, no method', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			id: 1,
			result: 42,
		};
		expect(isResponse(msg)).toBe(true);
		expect(isRequest(msg)).toBe(false);
		expect(isNotification(msg)).toBe(false);
	});

	it('isResponse (error): has id + error, no method', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			id: 1,
			error: { code: -32600, message: 'bad' },
		};
		expect(isResponse(msg)).toBe(true);
	});

	it('isStreamUpdateNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: 'prompt/update',
			params: {
				requestId: 1,
				body: { type: 'chunk', text: 'hello' },
			},
		};
		expect(isStreamUpdateNotification(msg)).toBe(true);
		expect(isNotification(msg)).toBe(true);
	});

	it('isStreamCancelNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: '$/stream/cancel',
			params: {
				requestId: 1,
			},
		};
		expect(isStreamCancelNotification(msg)).toBe(true);
	});
});

describe('RpcError', () => {
	it('methodNotFound produces -32601', () => {
		const err = RpcError.methodNotFound('foo');
		expect(err.code).toBe(-32601);
		expect(err.message).toContain('foo');
		expect(err.toPayload()).toEqual({
			code: -32601,
			message: 'Method not found: foo',
		});
	});

	it('invalidParams produces -32602', () => {
		const err = RpcError.invalidParams('missing x');
		expect(err.code).toBe(-32602);
		expect(err.toPayload()).toEqual({
			code: -32602,
			message: 'missing x',
		});
	});

	it('internalError produces -32603', () => {
		const err = RpcError.internalError('boom');
		expect(err.code).toBe(-32603);
	});

	it('toPayload includes data when present', () => {
		const err = new RpcError(-32000, 'custom', { detail: 'xyz' });
		expect(err.toPayload()).toEqual({
			code: -32000,
			message: 'custom',
			data: { detail: 'xyz' },
		});
	});
});

interface StreamChunk {
	type: 'chunk';
	text: string;
}

const serverDescriptor = namespace({
	add: method<(params: { a: number; b: number }) => Promise<number>>(),
	fail: method<(params: Record<string, never>) => Promise<never>>(),
	ping: notification<(params: { msg: string }) => Promise<void>>(),
	delayed: method<(params: { ms: number; value: string }) => Promise<string>>(),
	echo: method<(params: { n: number }) => Promise<number>>(),
	prompt: event<(params: { message: string }) => AsyncIterable<StreamChunk>>(),
	failStream:
		event<(params: Record<string, never>) => AsyncIterable<StreamChunk>>(),
	hang: method<(params: Record<string, never>) => Promise<never>>(),
});

const clientDescriptor = namespace({
	greet: method<(params: { name: string }) => Promise<string>>(),
	clientPing: notification<(params: { msg: string }) => Promise<void>>(),
});

type ServerApi = {
	add(params: { a: number; b: number }): Promise<number>;
	fail(params: Record<string, never>): Promise<never>;
	ping(params: { msg: string }): Promise<void>;
	delayed(params: { ms: number; value: string }): Promise<string>;
	echo(params: { n: number }): Promise<number>;
	prompt(params: { message: string }): AsyncIterable<StreamChunk>;
	failStream(params: Record<string, never>): AsyncIterable<StreamChunk>;
	hang(params: Record<string, never>): Promise<never>;
};

type ClientApi = {
	greet(params: { name: string }): Promise<string>;
	clientPing(params: { msg: string }): Promise<void>;
};

const defaultServerHandlers: ServerApi = {
	async add({ a, b }) {
		return a + b;
	},
	async fail() {
		throw new Error('boom');
	},
	async ping() {},
	async delayed({ ms, value }) {
		await new Promise((resolve) => setTimeout(resolve, ms));
		return value;
	},
	async echo({ n }) {
		return n;
	},
	async *prompt({ message }) {
		yield { type: 'chunk' as const, text: message };
	},
	async *failStream() {
		yield { type: 'chunk' as const, text: 'first' };
		throw new Error('stream failed');
	},
	async hang() {
		return await new Promise<never>(() => {});
	},
};

const defaultClientHandlers: ClientApi = {
	async greet({ name }) {
		return `hello ${name}`;
	},
	async clientPing() {},
};

function createPair(options?: {
	server?: Partial<ServerApi>;
	client?: Partial<ClientApi>;
}) {
	const { a, b } = createUnlockedPair<JsonRpcMessage>();
	const clientBinding = bindClient({
		duplex: a,
		server: serverDescriptor,
		client: clientDescriptor,
	});
	const clientClose = clientBinding.bind({
		...defaultClientHandlers,
		...options?.client,
	});
	const serverBinding = bindServer({
		duplex: b,
		server: serverDescriptor,
		client: clientDescriptor,
	});
	const serverClose = serverBinding.bind({
		...defaultServerHandlers,
		...options?.server,
	});
	return {
		client: { remote: clientBinding.remote, close: clientClose.close },
		server: { remote: serverBinding.remote, close: serverClose.close },
	};
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const values: T[] = [];
	for await (const value of iterable) {
		values.push(value);
	}
	return values;
}

describe('protocol-derived bindings', () => {
	it('basic request-response', async () => {
		const { client, server } = createPair();
		const result = await client.remote.add({ a: 3, b: 4 });

		expect(result).toBe(7);

		await client.close();
		await server.close();
	});

	it('error propagation — handler throws RpcError', async () => {
		const { client, server } = createPair({
			server: {
				async fail() {
					throw RpcError.invalidParams('nope');
				},
			},
		});

		await expect(client.remote.fail({})).rejects.toThrow('nope');

		await client.close();
		await server.close();
	});

	it('error propagation — handler throws plain Error', async () => {
		const { client, server } = createPair({
			server: {
				async fail() {
					throw new Error('plain boom');
				},
			},
		});

		await expect(client.remote.fail({})).rejects.toThrow('plain boom');

		await client.close();
		await server.close();
	});

	it('notifications — fire and forget', async () => {
		const received: string[] = [];
		const { client, server } = createPair({
			server: {
				async ping({ msg }) {
					received.push(msg);
				},
			},
		});

		await client.remote.ping({ msg: 'hello' });
		await client.remote.ping({ msg: 'world' });

		await new Promise((r) => setTimeout(r, 20));

		expect(received).toEqual(['hello', 'world']);

		await client.close();
		await server.close();
	});

	it('concurrent calls resolve independently', async () => {
		const { client, server } = createPair();

		const [r1, r2, r3] = await Promise.all([
			client.remote.delayed({ ms: 30, value: 'slow' }),
			client.remote.delayed({ ms: 10, value: 'medium' }),
			client.remote.delayed({ ms: 1, value: 'fast' }),
		]);

		expect(r1).toBe('slow');
		expect(r2).toBe('medium');
		expect(r3).toBe('fast');

		await client.close();
		await server.close();
	});

	it('bidirectional — both sides call and handle', async () => {
		const { client, server } = createPair();
		const [sum, greeting] = await Promise.all([
			client.remote.add({ a: 10, b: 20 }),
			server.remote.greet({ name: 'world' }),
		]);

		expect(sum).toBe(30);
		expect(greeting).toBe('hello world');

		await client.close();
		await server.close();
	});

	it('close rejects pending calls', async () => {
		const { client, server } = createPair();
		const promise = client.remote.hang({});

		await client.close();
		await server.close();

		await expect(promise).rejects.toThrow();
	});

	it('out-of-order responses correlate correctly', async () => {
		const { client, server } = createPair({
			server: {
				async echo({ n }) {
					await new Promise((resolve) => setTimeout(resolve, (10 - n) * 5));
					return n;
				},
			},
		});

		const results = await Promise.all(
			[1, 2, 3, 4, 5].map((n) => client.remote.echo({ n })),
		);

		expect(results).toEqual([1, 2, 3, 4, 5]);

		await client.close();
		await server.close();
	});

	it('event item delivery and completion', async () => {
		const { client, server } = createPair({
			server: {
				async *prompt({ message }) {
					yield { type: 'chunk' as const, text: `${message}:1` };
					yield { type: 'chunk' as const, text: `${message}:2` };
				},
			},
		});

		await expect(
			collect(client.remote.prompt({ message: 'hello' })),
		).resolves.toEqual([
			{ type: 'chunk', text: 'hello:1' },
			{ type: 'chunk', text: 'hello:2' },
		]);

		await client.close();
		await server.close();
	});

	it('event error propagation', async () => {
		const { client, server } = createPair({
			server: {
				async *failStream() {
					yield { type: 'chunk' as const, text: 'first' };
					throw new Error('stream failed');
				},
			},
		});

		const iterator = client.remote.failStream({})[Symbol.asyncIterator]();
		await expect(iterator.next()).resolves.toEqual({
			done: false,
			value: { type: 'chunk', text: 'first' },
		});
		await expect(iterator.next()).rejects.toThrow('stream failed');

		await client.close();
		await server.close();
	});

	it('close rejects active event flows', async () => {
		const { client, server } = createPair({
			server: {
				async *prompt({ message }) {
					yield { type: 'chunk' as const, text: message };
					await new Promise(() => {});
				},
			},
		});

		const iterator = client.remote
			.prompt({ message: 'hello' })
			[Symbol.asyncIterator]();
		await expect(iterator.next()).resolves.toEqual({
			done: false,
			value: { type: 'chunk', text: 'hello' },
		});

		const pending = iterator.next();
		await client.close();
		await server.close();

		await expect(pending).rejects.toThrow('Connection closed');
	});

	it('cancel stops active event flows', async () => {
		let cancelled = false;
		let resolveCancelled!: () => void;
		const cancelledPromise = new Promise<void>((resolve) => {
			resolveCancelled = resolve;
		});

		const { client, server } = createPair({
			server: {
				prompt() {
					return {
						[Symbol.asyncIterator]() {
							let yielded = false;
							return {
								async next() {
									if (yielded) {
										return await new Promise<IteratorResult<StreamChunk>>(
											() => {},
										);
									}
									yielded = true;
									return {
										done: false,
										value: { type: 'chunk' as const, text: 'first' },
									};
								},
								async return() {
									cancelled = true;
									resolveCancelled();
									return { done: true, value: undefined };
								},
							};
						},
					};
				},
			},
		});

		for await (const value of client.remote.prompt({ message: 'ignored' })) {
			expect(value).toEqual({ type: 'chunk', text: 'first' });
			break;
		}

		await cancelledPromise;
		expect(cancelled).toBe(true);

		await client.close();
		await server.close();
	});
});

// ---------------------------------------------------------------------------
// Wire-level interception helper
// ---------------------------------------------------------------------------

function createInterceptedPair(options?: {
	server?: Partial<ServerApi>;
	client?: Partial<ClientApi>;
}) {
	const clientToServer: JsonRpcMessage[] = [];
	const serverToClient: JsonRpcMessage[] = [];

	let controllerA!: ReadableStreamDefaultController<JsonRpcMessage>;
	let controllerB!: ReadableStreamDefaultController<JsonRpcMessage>;

	const readableA = new ReadableStream<JsonRpcMessage>({
		start(c) {
			controllerA = c;
		},
	});
	const readableB = new ReadableStream<JsonRpcMessage>({
		start(c) {
			controllerB = c;
		},
	});

	const writableA = new WritableStream<JsonRpcMessage>({
		write(chunk) {
			clientToServer.push(JSON.parse(JSON.stringify(chunk)) as JsonRpcMessage);
			controllerB.enqueue(chunk);
		},
	});
	const writableB = new WritableStream<JsonRpcMessage>({
		write(chunk) {
			serverToClient.push(JSON.parse(JSON.stringify(chunk)) as JsonRpcMessage);
			controllerA.enqueue(chunk);
		},
	});

	const a: Duplex<JsonRpcMessage> = {
		readable: readableA,
		writable: writableA,
		dispose: async () => {
			try {
				controllerA.close();
			} catch {
				/* already closed */
			}
		},
	};
	const b: Duplex<JsonRpcMessage> = {
		readable: readableB,
		writable: writableB,
		dispose: async () => {
			try {
				controllerB.close();
			} catch {
				/* already closed */
			}
		},
	};

	const clientBinding = bindClient({
		duplex: a,
		server: serverDescriptor,
		client: clientDescriptor,
	});
	const clientClose = clientBinding.bind({
		...defaultClientHandlers,
		...options?.client,
	});
	const serverBinding = bindServer({
		duplex: b,
		server: serverDescriptor,
		client: clientDescriptor,
	});
	const serverClose = serverBinding.bind({
		...defaultServerHandlers,
		...options?.server,
	});

	return {
		client: { remote: clientBinding.remote, close: clientClose.close },
		server: { remote: serverBinding.remote, close: serverClose.close },
		clientToServer,
		serverToClient,
	};
}

describe('stream wire protocol', () => {
	it('stream invocation is a JSON-RPC request (has id)', async () => {
		const { client, server, clientToServer } = createInterceptedPair({
			server: {
				async *prompt({ message }) {
					yield { type: 'chunk' as const, text: message };
				},
			},
		});

		await collect(client.remote.prompt({ message: 'hello' }));

		const invocation = clientToServer[0]!;
		expect(isRequest(invocation)).toBe(true);
		expect(invocation).toMatchObject({
			jsonrpc: '2.0',
			method: 'prompt',
			params: { message: 'hello' },
		});

		await client.close();
		await server.close();
	});

	it('yields arrive as {method}/update notifications with requestId', async () => {
		const { client, server, clientToServer, serverToClient } =
			createInterceptedPair({
				server: {
					async *prompt() {
						yield { type: 'chunk' as const, text: 'chunk-a' };
						yield { type: 'chunk' as const, text: 'chunk-b' };
					},
				},
			});

		await collect(client.remote.prompt({ message: 'hello' }));

		const requestId = (clientToServer[0] as JsonRpcMessage & { id: number }).id;
		const yieldNotifications = serverToClient.filter(
			(m) =>
				isNotification(m) &&
				(m as JsonRpcMessage & { method: string }).method === 'prompt/update',
		);

		expect(yieldNotifications).toHaveLength(2);
		expect(yieldNotifications[0]).toMatchObject({
			jsonrpc: '2.0',
			method: 'prompt/update',
			params: { requestId, body: { type: 'chunk', text: 'chunk-a' } },
		});
		expect(yieldNotifications[1]).toMatchObject({
			jsonrpc: '2.0',
			method: 'prompt/update',
			params: { requestId, body: { type: 'chunk', text: 'chunk-b' } },
		});

		await client.close();
		await server.close();
	});

	it('completion sends a JSON-RPC response with result null', async () => {
		const { client, server, clientToServer, serverToClient } =
			createInterceptedPair({
				server: {
					async *prompt() {
						yield { type: 'chunk' as const, text: 'done' };
					},
				},
			});

		await collect(client.remote.prompt({ message: 'hello' }));

		const requestId = (clientToServer[0] as JsonRpcMessage & { id: number }).id;
		const response = serverToClient.find(
			(m) =>
				isResponse(m) &&
				(m as JsonRpcMessage & { id: number }).id === requestId,
		);

		expect(response).toBeDefined();
		expect(response).toMatchObject({
			jsonrpc: '2.0',
			id: requestId,
			result: null,
		});

		await client.close();
		await server.close();
	});

	it('stream error sends a JSON-RPC error response', async () => {
		const { client, server, clientToServer, serverToClient } =
			createInterceptedPair({
				server: {
					async *failStream() {
						yield { type: 'chunk' as const, text: 'first' };
						throw new Error('stream boom');
					},
				},
			});

		const iter = client.remote.failStream({})[Symbol.asyncIterator]();
		await iter.next(); // 'first'
		await expect(iter.next()).rejects.toThrow('stream boom');

		const requestId = (clientToServer[0] as JsonRpcMessage & { id: number }).id;
		const errorResponse = serverToClient.find(
			(m) =>
				isResponse(m) &&
				'error' in m &&
				(m as JsonRpcMessage & { id: number }).id === requestId,
		);

		expect(errorResponse).toBeDefined();
		expect(
			(errorResponse as JsonRpcMessage & { error: { message: string } }).error
				.message,
		).toBe('stream boom');

		await client.close();
		await server.close();
	});

	it('cancel sends $/stream/cancel notification with requestId', async () => {
		let resolveCancelled!: () => void;
		const cancelledPromise = new Promise<void>((resolve) => {
			resolveCancelled = resolve;
		});

		const { client, server, clientToServer } = createInterceptedPair({
			server: {
				prompt() {
					return {
						[Symbol.asyncIterator]() {
							let yielded = false;
							return {
								async next() {
									if (yielded)
										return await new Promise<IteratorResult<StreamChunk>>(
											() => {},
										);
									yielded = true;
									return {
										done: false as const,
										value: { type: 'chunk' as const, text: 'first' },
									};
								},
								async return() {
									resolveCancelled();
									return { done: true as const, value: undefined };
								},
							};
						},
					};
				},
			},
		});

		for await (const value of client.remote.prompt({ message: 'ignored' })) {
			expect(value).toEqual({ type: 'chunk', text: 'first' });
			break;
		}

		await cancelledPromise;

		const requestId = (clientToServer[0] as JsonRpcMessage & { id: number }).id;
		const cancelNotification = clientToServer.find(
			(m) =>
				isNotification(m) &&
				(m as JsonRpcMessage & { method: string }).method === '$/stream/cancel',
		);

		expect(cancelNotification).toBeDefined();
		expect(cancelNotification).toMatchObject({
			jsonrpc: '2.0',
			method: '$/stream/cancel',
			params: { requestId },
		});

		await client.close();
		await server.close();
	});

	it('no $/stream/* messages appear on the wire for yields', async () => {
		const { client, server, clientToServer, serverToClient } =
			createInterceptedPair({
				server: {
					async *prompt({ message }) {
						yield { type: 'chunk' as const, text: `${message}:1` };
						yield { type: 'chunk' as const, text: `${message}:2` };
					},
				},
			});

		await collect(client.remote.prompt({ message: 'test' }));

		const allMessages = [...clientToServer, ...serverToClient];
		const streamNextMessages = allMessages.filter(
			(m) =>
				'method' in m &&
				typeof m.method === 'string' &&
				m.method === '$/stream/next',
		);
		expect(streamNextMessages).toHaveLength(0);

		await client.close();
		await server.close();
	});
});
