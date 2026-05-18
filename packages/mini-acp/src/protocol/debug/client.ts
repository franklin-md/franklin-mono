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
		async setContext(context: Parameters<MuClient['setContext']>[0]) {
			logLines(label, renderSetContext(context));

			try {
				await client.setContext(context);
			} catch (error) {
				logLines(label, renderThrown('setContext', error));
				throw error;
			}
		},
		prompt: debuggedTurn.prompt.bind(debuggedTurn),
		cancel: debuggedTurn.cancel.bind(debuggedTurn),
	};
}
