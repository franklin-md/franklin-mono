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
	const context = await createContext(factory);

	for (const action of fixture.actions) {
		switch (action.type) {
			case 'initialize':
				await context.initialize();
				break;
			case 'setContext':
				await context.setContext(action.context);
				break;
			case 'prompt':
				context.prompt(action.message);
				break;
			case 'cancel':
				context.cancel();
				break;
			case 'waitFor':
				await context.waitFor(action.predicate, action.timeoutMs);
				break;
		}
	}

	await context.drain();
	return context.transcript;
}
