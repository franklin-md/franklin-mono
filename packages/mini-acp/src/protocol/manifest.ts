import { method, event, notification, namespace } from '@franklin/lib';

import type { MuClient, MuAgent } from './types.js';

export const muServerDescriptor = namespace<MuClient>({
	initialize: method(),
	setContext: method(),
	prompt: event(),
	cancel: notification(),
});

export const muClientDescriptor = namespace<MuAgent>({
	toolExecute: method(),
});
