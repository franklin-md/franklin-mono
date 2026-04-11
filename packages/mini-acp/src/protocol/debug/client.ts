import type { MuClient } from '../types.js';

import { renderInitialize, renderSetContext, renderThrown } from './render.js';
import { logLines } from './style.js';
import { debugTurn } from './turn.js';

export function debugClient(client: MuClient, label: string): MuClient {
	const debuggedTurn = debugTurn(client, label);

	return {
		async initialize() {
			logLines(label, renderInitialize());

			try {
				await client.initialize();
			} catch (error) {
				logLines(label, renderThrown('initialize', error));
				throw error;
			}
		},
		async setContext(ctx: Parameters<MuClient['setContext']>[0]) {
			logLines(label, renderSetContext(ctx));

			try {
				await client.setContext(ctx);
			} catch (error) {
				logLines(label, renderThrown('setContext', error));
				throw error;
			}
		},
		prompt: debuggedTurn.prompt.bind(debuggedTurn),
		cancel: debuggedTurn.cancel.bind(debuggedTurn),
	};
}
