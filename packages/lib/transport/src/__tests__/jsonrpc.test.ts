import { describe, expect, it } from 'vitest';
import type { Duplex } from '../streams/types.js';

import type { JsonRpcMessage } from '../jsonrpc/types.js';
import { isRequest, isNotification, isResponse } from '../jsonrpc/types.js';
import { RpcError } from '../jsonrpc/errors.js';
import { createConnection } from '../jsonrpc/connection.js';

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

function createPair() {
	const { a, b, close } = createUnlockedPair<JsonRpcMessage>();
	const connA = createConnection(a);
	const connB = createConnection(b);
	return { connA, connB, close };
}

describe('connection', () => {
	it('basic request-response', async () => {
		const { connA, connB } = createPair();

		connB.handle<{ a: number; b: number }, number>(
			'add',
			async ({ a, b }) => a + b,
		);

		const add = connA.caller<{ a: number; b: number }, number>('add');
		const result = await add({ a: 3, b: 4 });

		expect(result).toBe(7);

		await connA.close();
		await connB.close();
	});

	it('error propagation — handler throws RpcError', async () => {
		const { connA, connB } = createPair();

		connB.handle('fail', async () => {
			throw RpcError.invalidParams('nope');
		});

		const fail = connA.caller<Record<string, never>, never>('fail');

		await expect(fail({})).rejects.toThrow('nope');

		await connA.close();
		await connB.close();
	});

	it('error propagation — handler throws plain Error', async () => {
		const { connA, connB } = createPair();

		connB.handle('fail', async () => {
			throw new Error('plain boom');
		});

		const fail = connA.caller<Record<string, never>, never>('fail');

		await expect(fail({})).rejects.toThrow('plain boom');

		await connA.close();
		await connB.close();
	});

	it('method not found', async () => {
		const { connA, connB } = createPair();

		const missing = connA.caller<Record<string, never>, never>('nonexistent');

		await expect(missing({})).rejects.toThrow('Method not found');

		await connA.close();
		await connB.close();
	});

	it('notifications — fire and forget', async () => {
		const { connA, connB } = createPair();

		const received: string[] = [];
		connB.onNotification<{ msg: string }>('ping', ({ msg }) => {
			received.push(msg);
		});

		const ping = connA.notifier<{ msg: string }>('ping');
		ping({ msg: 'hello' });
		ping({ msg: 'world' });

		await new Promise((r) => setTimeout(r, 20));

		expect(received).toEqual(['hello', 'world']);

		await connA.close();
		await connB.close();
	});

	it('concurrent calls resolve independently', async () => {
		const { connA, connB } = createPair();

		connB.handle<{ ms: number; value: string }, string>(
			'delayed',
			async ({ ms, value }) => {
				await new Promise((r) => setTimeout(r, ms));
				return value;
			},
		);

		const delayed = connA.caller<{ ms: number; value: string }, string>(
			'delayed',
		);

		const [r1, r2, r3] = await Promise.all([
			delayed({ ms: 30, value: 'slow' }),
			delayed({ ms: 10, value: 'medium' }),
			delayed({ ms: 1, value: 'fast' }),
		]);

		expect(r1).toBe('slow');
		expect(r2).toBe('medium');
		expect(r3).toBe('fast');

		await connA.close();
		await connB.close();
	});

	it('bidirectional — both sides call and handle', async () => {
		const { connA, connB } = createPair();

		connA.handle<{ name: string }, string>(
			'greet',
			async ({ name }) => `hello ${name}`,
		);
		connB.handle<{ a: number; b: number }, number>(
			'add',
			async ({ a, b }) => a + b,
		);

		const add = connA.caller<{ a: number; b: number }, number>('add');
		const greet = connB.caller<{ name: string }, string>('greet');

		const [sum, greeting] = await Promise.all([
			add({ a: 10, b: 20 }),
			greet({ name: 'world' }),
		]);

		expect(sum).toBe(30);
		expect(greeting).toBe('hello world');

		await connA.close();
		await connB.close();
	});

	it('close rejects pending calls', async () => {
		const { connA, connB } = createPair();

		connB.handle('hang', () => new Promise(() => {}));

		const hang = connA.caller<Record<string, never>, never>('hang');
		const promise = hang({});

		await connA.close();
		await connB.close();

		await expect(promise).rejects.toThrow();
	});

	it('out-of-order responses correlate correctly', async () => {
		const { connA, connB } = createPair();

		connB.handle<{ n: number }, number>('echo', async ({ n }) => {
			await new Promise((r) => setTimeout(r, (10 - n) * 5));
			return n;
		});

		const echo = connA.caller<{ n: number }, number>('echo');

		const results = await Promise.all([1, 2, 3, 4, 5].map((n) => echo({ n })));

		expect(results).toEqual([1, 2, 3, 4, 5]);

		await connA.close();
		await connB.close();
	});
});
