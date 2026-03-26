import { ipcMain } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import { getValueAtPath } from './lookup.js';
import type { BindingContext } from './types.js';

export function registerMethodHandler(
	name: string,
	context: BindingContext,
	path: string[],
): () => void {
	const channels = createChannels(name);
	const channel = channels.getMethodChannel(path);
	ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
		const method = getValueAtPath(context.impl, path) as (
			...invokeArgs: unknown[]
		) => Promise<unknown>;
		return await method(...args);
	});

	return () => ipcMain.removeHandler(channel);
}
