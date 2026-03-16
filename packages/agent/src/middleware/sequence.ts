import type { Cont, Middleware } from './types.js';
import { COMMAND_METHODS, EVENT_METHODS } from './types.js';
import type { AgentCommands, AgentEvents } from '../types.js';

// ---------------------------------------------------------------------------
// sequenceCommands — combine command middlewares
// ---------------------------------------------------------------------------

/*
f: A x (A->B) -> B
g: A x (A->B) -> B

https://haskellforall.com/2012/12/the-continuation-monad
*/

export function composeCont<Fn extends (...args: any[]) => any>(
	f: Cont<Fn>,
	g: Cont<Fn>,
): Cont<Fn> {
	return (
		params: Parameters<Fn>[0],
		next: (params: Parameters<Fn>[0]) => ReturnType<Fn>,
	) => {
		return f(params, (params: Parameters<Fn>[0]) => g(params, next));
	};
}

// ---------------------------------------------------------------------------
// sequence — combine full middlewares (commands + events)
// ---------------------------------------------------------------------------

// TODO: Rename
export function sequence(a: Middleware, b: Middleware): Middleware {
	const combined: Partial<Middleware> = {};

	// We must compose commands forward and events backward
	for (const method of COMMAND_METHODS) {
		combined[method] = composeCont(
			a[method] as Cont<AgentCommands[typeof method]>,
			b[method] as Cont<AgentCommands[typeof method]>,
		);
	}
	for (const method of EVENT_METHODS) {
		combined[method] = composeCont(
			b[method] as Cont<AgentEvents[typeof method]>,
			a[method] as Cont<AgentEvents[typeof method]>,
		);
	}

	return combined as Middleware;
}
