import { describe, expect, it } from 'vitest';
import type { Duplex } from '../../streams/types.js';

import type { JsonRpcMessage } from '../types.js';
import {
	isEventCancelNotification,
	isEventCompleteNotification,
	isEventErrorNotification,
	isEventNextNotification,
	isNotification,
	isRequest,
	isResponse,
} from '../types.js';
import { RpcError } from '../errors.js';
import { bindClient, bindServer } from '../binding/index.js';
import {
	defineManifest,
	event,
	type Protocol,
	request,
	notification,
} from '../protocol/index.js';

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
		close: async () => {
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
		close: async () => {
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
			await a.close();
			await b.close();
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

	it('isEventNextNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: '$/event/next',
			params: {
				callId: 1,
				value: 'chunk',
			},
		};
		expect(isEventNextNotification(msg)).toBe(true);
		expect(isNotification(msg)).toBe(true);
	});

	it('isEventCompleteNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: '$/event/complete',
			params: {
				callId: 1,
			},
		};
		expect(isEventCompleteNotification(msg)).toBe(true);
	});

	it('isEventErrorNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: '$/event/error',
			params: {
				callId: 1,
				error: { code: -32603, message: 'boom' },
			},
		};
		expect(isEventErrorNotification(msg)).toBe(true);
	});

	it('isEventCancelNotification', () => {
		const msg: JsonRpcMessage = {
			jsonrpc: '2.0',
			method: '$/event/cancel',
			params: {
				callId: 1,
			},
		};
		expect(isEventCancelNotification(msg)).toBe(true);
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

interface ServerApi {
	add(params: { a: number; b: number }): Promise<number>;
	fail(params: Record<string, never>): Promise<never>;
	ping(params: { msg: string }): Promise<void>;
	delayed(params: { ms: number; value: string }): Promise<string>;
	echo(params: { n: number }): Promise<number>;
	prompt(params: { message: string }): AsyncIterable<string>;
	failStream(params: Record<string, never>): AsyncIterable<string>;
	hang(params: Record<string, never>): Promise<never>;
}

interface ClientApi {
	greet(params: { name: string }): Promise<string>;
	clientPing(params: { msg: string }): Promise<void>;
}

type TestProtocol = Protocol<ServerApi, ClientApi>;

const manifest = defineManifest<ServerApi, ClientApi>({
	server: {
		add: request(),
		fail: request(),
		ping: notification(),
		delayed: request(),
		echo: request(),
		prompt: event(),
		failStream: event(),
		hang: request(),
	},
	client: {
		greet: request(),
		clientPing: notification(),
	},
});

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
		yield message;
	},
	async *failStream() {
		yield 'first';
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
	const client = bindClient({
		duplex: a as TestProtocol,
		manifest,
		handlers: {
			...defaultClientHandlers,
			...options?.client,
		},
	});
	const server = bindServer({
		duplex: b as Protocol<ClientApi, ServerApi>,
		manifest,
		handlers: {
			...defaultServerHandlers,
			...options?.server,
		},
	});
	return { client, server };
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
					yield `${message}:1`;
					yield `${message}:2`;
				},
			},
		});

		await expect(
			collect(client.remote.prompt({ message: 'hello' })),
		).resolves.toEqual(['hello:1', 'hello:2']);

		await client.close();
		await server.close();
	});

	it('event error propagation', async () => {
		const { client, server } = createPair({
			server: {
				async *failStream() {
					yield 'first';
					throw new Error('stream failed');
				},
			},
		});

		const iterator = client.remote.failStream({})[Symbol.asyncIterator]();
		await expect(iterator.next()).resolves.toEqual({
			done: false,
			value: 'first',
		});
		await expect(iterator.next()).rejects.toThrow('stream failed');

		await client.close();
		await server.close();
	});

	it('close rejects active event flows', async () => {
		const { client, server } = createPair({
			server: {
				async *prompt({ message }) {
					yield message;
					await new Promise(() => {});
				},
			},
		});

		const iterator = client.remote
			.prompt({ message: 'hello' })
			[Symbol.asyncIterator]();
		await expect(iterator.next()).resolves.toEqual({
			done: false,
			value: 'hello',
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
										return await new Promise<IteratorResult<string>>(() => {});
									}
									yielded = true;
									return { done: false, value: 'first' };
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
			expect(value).toBe('first');
			break;
		}

		await cancelledPromise;
		expect(cancelled).toBe(true);

		await client.close();
		await server.close();
	});
});
