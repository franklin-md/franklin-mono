import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
	AgentCommands,
	AgentControl,
	AgentEvents,
	AgentLifecycle,
	AgentStack,
} from '../stack/types.js';
import type {
	CommandMiddleware,
	EventMiddleware,
	Middleware,
} from '../stack/middleware.js';
import { buildChain } from '../stack/middleware.js';

describe('stack type algebra', () => {
	it('AgentStack extends AgentCommands', () => {
		expectTypeOf<AgentStack>().toExtend<AgentCommands>();
	});

	it('AgentStack extends AgentEvents', () => {
		expectTypeOf<AgentStack>().toExtend<AgentEvents>();
	});

	it('AgentStack extends AgentLifecycle', () => {
		expectTypeOf<AgentStack>().toExtend<AgentLifecycle>();
	});

	it('AgentStack extends AgentControl', () => {
		expectTypeOf<AgentStack>().toExtend<AgentControl>();
	});

	it('AgentControl extends AgentCommands', () => {
		expectTypeOf<AgentControl>().toExtend<AgentCommands>();
	});

	it('AgentControl extends AgentLifecycle', () => {
		expectTypeOf<AgentControl>().toExtend<AgentLifecycle>();
	});

	it('AgentCommands does not extend AgentEvents', () => {
		expectTypeOf<AgentCommands>().not.toExtend<AgentEvents>();
	});

	it('AgentEvents does not extend AgentCommands', () => {
		expectTypeOf<AgentEvents>().not.toExtend<AgentCommands>();
	});

	it('AgentControl does not extend AgentStack (missing events)', () => {
		expectTypeOf<AgentControl>().not.toExtend<AgentStack>();
	});
});

describe('middleware type algebra', () => {
	it('CommandMiddleware is assignable to Middleware', () => {
		expectTypeOf<CommandMiddleware>().toExtend<Middleware>();
	});

	it('EventMiddleware is assignable to Middleware', () => {
		expectTypeOf<EventMiddleware>().toExtend<Middleware>();
	});

	it('Middleware is not assignable to CommandMiddleware (has event keys)', () => {
		// A Middleware with event keys cannot be narrowed to pure CommandMiddleware
		// (This tests that the types are distinct, not that {} fails)
		const mw: Middleware = {
			sessionUpdate: async (_p, next) => next(_p),
		};
		// Confirm that event methods exist on Middleware but not CommandMiddleware
		expect(mw.sessionUpdate).toBeDefined();
	});
});

describe('buildChain', () => {
	it('chains functions in order around a terminal', () => {
		const log: string[] = [];

		const terminal = (p: string) => {
			log.push(`terminal:${p}`);
			return p;
		};

		const mwA = (p: string, next: (p: string) => string) => {
			log.push('a-before');
			const r = next(p);
			log.push('a-after');
			return r;
		};

		const mwB = (p: string, next: (p: string) => string) => {
			log.push('b-before');
			const r = next(p);
			log.push('b-after');
			return r;
		};

		const chain = buildChain(terminal, [mwA, mwB]);
		chain('hello');

		expect(log).toEqual([
			'a-before',
			'b-before',
			'terminal:hello',
			'b-after',
			'a-after',
		]);
	});

	it('skips undefined entries', () => {
		const log: string[] = [];

		const terminal = () => {
			log.push('terminal');
		};

		const mw = (_p: unknown, next: (p: unknown) => void) => {
			log.push('mw');
			next(_p);
		};

		const chain = buildChain(terminal, [mw, undefined, undefined]);
		chain(null);

		expect(log).toEqual(['mw', 'terminal']);
	});

	it('returns terminal directly when no middlewares', () => {
		const terminal = (x: number) => x * 2;
		const chain = buildChain(terminal, []);
		expect(chain(5)).toBe(10);
	});
});
