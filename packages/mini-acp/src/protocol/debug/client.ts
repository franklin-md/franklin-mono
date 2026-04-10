import type { MuClient } from '../types.js';

import { renderInitialize, renderSetContext, renderThrown } from './render.js';
import { line } from './style.js';
import { debugTurn } from './turn.js';

export function debugClient(client: MuClient, label: string): MuClient {
	const debuggedTurn = debugTurn(client, label);

	return {
		async initialize() {
			console.log(line(label, renderInitialize()));

			try {
				await client.initialize();
			} catch (error) {
				console.log(line(label, renderThrown('initialize', error)));
				throw error;
			}
		},
		async setContext(ctx: Parameters<MuClient['setContext']>[0]) {
			console.log(line(label, renderSetContext(ctx)));

			try {
				await client.setContext(ctx);
			} catch (error) {
				console.log(line(label, renderThrown('setContext', error)));
				throw error;
			}
		},
		prompt: debuggedTurn.prompt.bind(debuggedTurn),
		cancel: debuggedTurn.cancel.bind(debuggedTurn),
	};
}
