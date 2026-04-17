import { describe, it, expect, vi } from 'vitest';
import { apply } from '../middleware/apply.js';
import { compose, composeMethod } from '../middleware/compose.js';
import { passThrough } from '../middleware/pass-through.js';
import type { Middleware, MethodMiddleware } from '../middleware/types.js';

// ---------------------------------------------------------------------------
// Minimal protocol-like interfaces for testing
// ---------------------------------------------------------------------------

interface FakeServer {
	greet(params: { name: string }): Promise<string>;
	notify(params: { msg: string }): Promise<void>;
}

interface FakeClient {
	execute(params: { cmd: string }): Promise<{ ok: boolean }>;
}

// ---------------------------------------------------------------------------
// passThrough
// ---------------------------------------------------------------------------

describe('passThrough', () => {
	it('forwards params unchanged', async () => {
		const mw = passThrough<FakeServer['greet']>();
		const terminal = vi.fn(async (params: { name: string }) => params.name);

		const result = await mw({ name: 'test' }, terminal);

		expect(result).toBe('test');
		expect(terminal).toHaveBeenCalledWith({ name: 'test' });
	});
});

// ---------------------------------------------------------------------------
// composeMethod
// ---------------------------------------------------------------------------

describe('composeMethod', () => {
	it('chains a → b → next', async () => {
		const calls: string[] = [];

		const a: MethodMiddleware<FakeServer['greet']> = (params, next) => {
			calls.push('a-before');
			const result = next({ name: `[a:${params.name}]` });
			calls.push('a-after');
			return result;
		};

		const b: MethodMiddleware<FakeServer['greet']> = (params, next) => {
			calls.push('b-before');
			const result = next({ name: `[b:${params.name}]` });
			calls.push('b-after');
			return result;
		};

		const composed = composeMethod(a, b);
		const terminal = vi.fn(async (params: { name: string }) => params.name);

		const result = await composed({ name: 'test' }, terminal);

		expect(result).toBe('[b:[a:test]]');
		expect(calls).toEqual(['a-before', 'b-before', 'b-after', 'a-after']);
		expect(terminal).toHaveBeenCalledWith({ name: '[b:[a:test]]' });
	});
});

// ---------------------------------------------------------------------------
// compose
// ---------------------------------------------------------------------------

describe('compose', () => {
	it('returns empty middleware for zero args', () => {
		const mw = compose<FakeServer>();
		expect(Object.keys(mw)).toEqual([]);
	});

	it('returns the single middleware unchanged', () => {
		const single: Middleware<FakeServer> = {
			greet: (params, next) => next(params),
			notify: passThrough(),
		};
		const mw = compose<FakeServer>(single);
		expect(mw).toBe(single);
	});

	it('composes all methods across middleware', async () => {
		const a: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `a:${params.name}` }),
			notify: passThrough(),
		};
		const b: Middleware<FakeServer> = {
			greet: passThrough(),
			notify: (params, next) => next({ msg: `b:${params.msg}` }),
		};

		const mw = compose<FakeServer>(a, b);
		expect(mw.greet).toBeDefined();
		expect(mw.notify).toBeDefined();
	});

	it('composes overlapping methods in outermost-first order', async () => {
		const a: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `a:${params.name}` }),
			notify: passThrough(),
		};
		const b: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `b:${params.name}` }),
			notify: passThrough(),
		};

		const mw = compose<FakeServer>(a, b);
		const terminal = vi.fn(async (params: { name: string }) => params.name);

		const result = await mw.greet({ name: 'x' }, terminal);
		expect(result).toBe('b:a:x');
	});

	it('composes three middleware', async () => {
		const a: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `a:${params.name}` }),
			notify: passThrough(),
		};
		const b: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `b:${params.name}` }),
			notify: passThrough(),
		};
		const c: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `c:${params.name}` }),
			notify: passThrough(),
		};

		const mw = compose<FakeServer>(a, b, c);
		const terminal = vi.fn(async (params: { name: string }) => params.name);

		const result = await mw.greet({ name: 'x' }, terminal);
		expect(result).toBe('c:b:a:x');
	});
});

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------

describe('apply', () => {
	it('wraps methods present in middleware', async () => {
		const mw: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `mw:${params.name}` }),
			notify: passThrough(),
		};

		const target: FakeServer = {
			greet: async (params) => `hello ${params.name}`,
			notify: vi.fn(async () => {}),
		};

		const wrapped = apply(mw, target);

		const result = await wrapped.greet({ name: 'world' });
		expect(result).toBe('hello mw:world');
	});

	it('passThrough leaves methods unchanged', async () => {
		const mw: Middleware<FakeServer> = {
			greet: passThrough(),
			notify: passThrough(),
		};

		const notifyImpl = vi.fn(async () => {});
		const target: FakeServer = {
			greet: async (params) => `hello ${params.name}`,
			notify: notifyImpl,
		};

		const wrapped = apply(mw, target);

		await wrapped.notify({ msg: 'hi' });
		expect(notifyImpl).toHaveBeenCalledWith({ msg: 'hi' });

		const result = await wrapped.greet({ name: 'world' });
		expect(result).toBe('hello world');
	});

	it('works with client-side middleware', async () => {
		const mw: Middleware<FakeClient> = {
			execute: async (params, next) => {
				if (params.cmd === 'blocked') return { ok: false };
				return next(params);
			},
		};

		const target: FakeClient = {
			execute: async () => ({ ok: true }),
		};

		const wrapped = apply(mw, target);

		expect(await wrapped.execute({ cmd: 'run' })).toEqual({ ok: true });
		expect(await wrapped.execute({ cmd: 'blocked' })).toEqual({ ok: false });
	});

	it('middleware can short-circuit without calling next', async () => {
		const terminal = vi.fn(async () => 'should not reach');

		const mw: Middleware<FakeServer> = {
			greet: async () => 'short-circuited',
			notify: passThrough(),
		};

		const target: FakeServer = {
			greet: terminal,
			notify: async () => {},
		};

		const wrapped = apply(mw, target);
		const result = await wrapped.greet({ name: 'x' });

		expect(result).toBe('short-circuited');
		expect(terminal).not.toHaveBeenCalled();
	});

	it('compose + apply chains correctly end-to-end', async () => {
		const auth: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `auth(${params.name})` }),
			notify: passThrough(),
		};
		const logging: Middleware<FakeServer> = {
			greet: (params, next) => next({ name: `log(${params.name})` }),
			notify: passThrough(),
		};

		const target: FakeServer = {
			greet: async (params) => `result:${params.name}`,
			notify: async () => {},
		};

		const stack = compose<FakeServer>(auth, logging);
		const wrapped = apply(stack, target);

		const result = await wrapped.greet({ name: 'bob' });
		expect(result).toBe('result:log(auth(bob))');
	});
});
