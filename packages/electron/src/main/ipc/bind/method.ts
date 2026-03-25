import { ipcMain } from 'electron';

import type { MethodDescriptor } from '../../../shared/descriptors/types.js';
import { serializeProxy } from '../../../shared/descriptors/serde.js';
import { createChannels } from '../../../shared/channels.js';
import type { BoundWindow } from './types.js';
import { getValueAtPath } from './bound-window.js';

export function registerMethodHandler(
	name: string,
	binding: BoundWindow,
	path: string[],
	descriptor: MethodDescriptor,
): () => void {
	const channels = createChannels(name);
	const channel = channels.getMethodChannel(path);
	ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
		const method = getValueAtPath(binding.impl, path) as (
			...invokeArgs: unknown[]
		) => Promise<unknown>;
		const result = await method(...args);
		return descriptor.returns
			? await serializeProxy(result, descriptor.returns)
			: result;
	});

	return () => ipcMain.removeHandler(channel);
}
