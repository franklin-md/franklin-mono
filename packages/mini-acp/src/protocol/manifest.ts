import { defineManifest, request, event } from '@franklin/transport';

import type { MuClient, MuAgent } from './types.js';

export const muManifest = defineManifest<MuClient, MuAgent>({
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
