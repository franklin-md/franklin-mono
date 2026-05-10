import { method, event, notification, namespace } from '@franklin/lib';
import type { MuClient, MuAgent } from '../protocol/types.js';

export const miniACPRpcServerDescriptor = namespace<MuClient>({
	initialize: method(),
	setContext: method(),
	prompt: event(),
	cancel: notification(),
});

export const miniACPRpcClientDescriptor = namespace<MuAgent>({
	toolExecute: method(),
});
