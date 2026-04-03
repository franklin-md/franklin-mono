// ---------------------------------------------------------------------------
// Spec Tester — execute
//
// Takes a fixture and an agent factory, runs the actions, collects the
// transcript as seen from the client side.
// ---------------------------------------------------------------------------

import type { Fixture, AgentFactory, Transcript } from '../types.js';
import { createContext } from './context.js';

export async function execute(
	fixture: Fixture,
	factory: AgentFactory,
): Promise<Transcript> {
	const ctx = createContext(factory);

	for (const action of fixture.actions) {
		switch (action.type) {
			case 'initialize':
				await ctx.initialize();
				break;
			case 'setContext':
				await ctx.setContext(action.ctx);
				break;
			case 'prompt':
				ctx.prompt(action.message);
				break;
			case 'cancel':
				ctx.cancel();
				break;
			case 'waitFor':
				await ctx.waitFor(action.predicate, action.timeoutMs);
				break;
		}
	}

	await ctx.drain();
	return ctx.transcript;
}
