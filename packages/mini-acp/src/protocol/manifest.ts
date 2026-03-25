import {
	defineManifest,
	request,
	event,
	notification,
} from '@franklin/transport';

import type { MuClient, MuAgent } from './types.js';

export const muManifest = defineManifest<MuClient, MuAgent>({
	server: {
		initialize: request(),
		setContext: request(),
		prompt: event(),
		cancel: notification(),
	},
	client: {
		toolExecute: request(),
	},
});
