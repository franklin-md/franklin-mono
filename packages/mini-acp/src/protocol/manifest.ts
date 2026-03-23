import { defineManifest, request, event } from '@franklin/transport';

import type { MiniACPClient, MiniACPAgent } from './types.js';

export const miniACPManifest = defineManifest<MiniACPClient, MiniACPAgent>({
	server: {
		initialize: request(),
		setContext: request(),
		prompt: event(),
		cancel: request(),
	},
	client: {
		toolExecute: request(),
	},
});
