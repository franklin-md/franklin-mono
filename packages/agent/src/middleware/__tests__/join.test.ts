import { describe, expect, it, vi } from 'vitest';

import type { AgentCommands, AgentEvents } from '../../types.js';
import type { Middleware } from '../types.js';
import { emptyMiddleware } from '../empty.js';
import { joinCommands, joinEvents } from '../join.js';
import { sequence } from '../sequence.js';

// ---------------------------------------------------------------------------
// Helpers — minimal terminal stubs
// ---------------------------------------------------------------------------

function createTerminalCommands(
	overrides?: Partial<AgentCommands>,
): AgentCommands {
	const noop = () => Promise.resolve({}) as Promise<never>;
	return {
		initialize: noop,
		newSession: noop,
		loadSession: noop,
		listSessions: noop,
		prompt: async () => ({ stopReason: 'end_turn' as const }),
		cancel: async () => {},
		setSessionMode: noop,
		setSessionConfigOption: noop,
		authenticate: noop,
		...overrides,
	};
}

function createTerminalEvents(overrides?: Partial<AgentEvents>): AgentEvents {
	const noop = () => Promise.resolve({}) as Promise<never>;
	return {
		sessionUpdate: async () => {},
		requestPermission: noop,
		readTextFile: noop,
		writeTextFile: noop,
		createTerminal: noop,
		terminalOutput: noop,
		releaseTerminal: noop,
		waitForTerminalExit: noop,
		killTerminal: noop,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// joinCommands
// ---------------------------------------------------------------------------

describe('joinCommands', () => {
	it('forwards params through emptyMiddleware to terminal unchanged', async () => {
		const terminalPrompt = vi.fn(async () => ({
			stopReason: 'end_turn' as const,
		}));
		const terminal = createTerminalCommands({ prompt: terminalPrompt });

		const commands = joinCommands(emptyMiddleware, terminal);

		const params = {
			sessionId: 'test',
			prompt: [{ type: 'text' as const, text: 'hello' }],
		};
		const result = await commands.prompt(params);

		expect(terminalPrompt).toHaveBeenCalledWith(params);
		expect(result.stopReason).toBe('end_turn');
	});

	it('middleware can modify params before forwarding', async () => {
		const captured: unknown[] = [];
		const terminal = createTerminalCommands({
			prompt: async (p) => {
				captured.push(p);
				return { stopReason: 'end_turn' as const };
			},
		});

		const mw: Middleware = {
			...emptyMiddleware,
			prompt: async (params, next) => {
				return next({
					...params,
					prompt: [{ type: 'text', text: '[PREFIX] hello' }],
				});
			},
		};

		const commands = joinCommands(mw, terminal);
		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(captured).toHaveLength(1);
		expect(
			(captured[0] as { prompt: { text: string }[] }).prompt[0]?.text,
		).toBe('[PREFIX] hello');
	});

	it('middleware can short-circuit without calling next', async () => {
		const terminalPrompt = vi.fn();
		const terminal = createTerminalCommands({ prompt: terminalPrompt });

		const mw: Middleware = {
			...emptyMiddleware,
			prompt: async () => ({ stopReason: 'end_turn' as const }),
		};

		const commands = joinCommands(mw, terminal);
		const result = await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(result.stopReason).toBe('end_turn');
		expect(terminalPrompt).not.toHaveBeenCalled();
	});

	it('works with composed middleware via sequence', async () => {
		const log: string[] = [];
		const terminal = createTerminalCommands({
			prompt: async () => {
				log.push('terminal');
				return { stopReason: 'end_turn' as const };
			},
		});

		const mw1: Middleware = {
			...emptyMiddleware,
			prompt: async (params, next) => {
				log.push('mw1-before');
				const result = await next(params);
				log.push('mw1-after');
				return result;
			},
		};

		const mw2: Middleware = {
			...emptyMiddleware,
			prompt: async (params, next) => {
				log.push('mw2-before');
				const result = await next(params);
				log.push('mw2-after');
				return result;
			},
		};

		const composed = sequence(mw1, mw2);
		const commands = joinCommands(composed, terminal);
		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		// Commands flow: mw1 → mw2 → terminal
		expect(log).toEqual([
			'mw1-before',
			'mw2-before',
			'terminal',
			'mw2-after',
			'mw1-after',
		]);
	});

	it('non-overridden methods pass through to terminal', async () => {
		const terminalInit = vi.fn(async () => ({
			protocolVersion: 1,
			serverCapabilities: {},
		}));
		const terminal = createTerminalCommands({
			initialize: terminalInit,
		});

		// Middleware only touches prompt
		const mw: Middleware = {
			...emptyMiddleware,
			prompt: async (_params, next) => next(_params),
		};

		const commands = joinCommands(mw, terminal);
		await commands.initialize({
			protocolVersion: 1,
			clientCapabilities: {},
		});

		expect(terminalInit).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// joinEvents
// ---------------------------------------------------------------------------

describe('joinEvents', () => {
	it('forwards params through emptyMiddleware to terminal unchanged', async () => {
		const terminalUpdate = vi.fn(async () => {});
		const terminal = createTerminalEvents({
			sessionUpdate: terminalUpdate,
		});

		const events = joinEvents(emptyMiddleware, terminal);

		const params = {
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk' as const,
				content: { type: 'text' as const, text: 'hi' },
			},
		};
		await events.sessionUpdate(params);

		expect(terminalUpdate).toHaveBeenCalledWith(params);
	});

	it('middleware can intercept events', async () => {
		const log: string[] = [];
		const terminal = createTerminalEvents({
			sessionUpdate: async () => {
				log.push('handler');
			},
		});

		const mw: Middleware = {
			...emptyMiddleware,
			sessionUpdate: async (params, next) => {
				log.push('mw');
				return next(params);
			},
		};

		const events = joinEvents(mw, terminal);
		await events.sessionUpdate({
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} as never);

		expect(log).toEqual(['mw', 'handler']);
	});

	it('middleware can short-circuit events', async () => {
		const terminalUpdate = vi.fn();
		const terminal = createTerminalEvents({
			sessionUpdate: terminalUpdate,
		});

		const mw: Middleware = {
			...emptyMiddleware,
			sessionUpdate: async () => {
				// swallow the event
			},
		};

		const events = joinEvents(mw, terminal);
		await events.sessionUpdate({
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} as never);

		expect(terminalUpdate).not.toHaveBeenCalled();
	});

	it('composed middleware processes events in reverse order', async () => {
		const log: string[] = [];
		const terminal = createTerminalEvents({
			sessionUpdate: async () => {
				log.push('handler');
			},
		});

		const mw1: Middleware = {
			...emptyMiddleware,
			sessionUpdate: async (params, next) => {
				log.push('mw1');
				return next(params);
			},
		};

		const mw2: Middleware = {
			...emptyMiddleware,
			sessionUpdate: async (params, next) => {
				log.push('mw2');
				return next(params);
			},
		};

		// sequence(mw1, mw2): commands go mw1→mw2, events go mw2→mw1
		const composed = sequence(mw1, mw2);
		const events = joinEvents(composed, terminal);
		await events.sessionUpdate({
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} as never);

		// Events flow: mw2 → mw1 → handler (reverse of command order)
		expect(log).toEqual(['mw2', 'mw1', 'handler']);
	});
});

// ---------------------------------------------------------------------------
// joinCommands + joinEvents together (full stack)
// ---------------------------------------------------------------------------

describe('join full stack', () => {
	it('same middleware intercepts both commands and events', async () => {
		const log: string[] = [];

		const terminal = createTerminalCommands({
			prompt: async () => {
				log.push('terminal-prompt');
				return { stopReason: 'end_turn' as const };
			},
		});

		const handler = createTerminalEvents({
			sessionUpdate: async () => {
				log.push('handler-update');
			},
		});

		const mw: Middleware = {
			...emptyMiddleware,
			prompt: async (params, next) => {
				log.push('mw-prompt');
				return next(params);
			},
			sessionUpdate: async (params, next) => {
				log.push('mw-update');
				return next(params);
			},
		};

		const commands = joinCommands(mw, terminal);
		const events = joinEvents(mw, handler);

		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});
		await events.sessionUpdate({
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} as never);

		expect(log).toEqual([
			'mw-prompt',
			'terminal-prompt',
			'mw-update',
			'handler-update',
		]);
	});
});
