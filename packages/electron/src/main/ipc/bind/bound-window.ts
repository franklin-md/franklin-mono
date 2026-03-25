import type { Duplex } from '@franklin/transport';
import type { WebContents } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import { createMainIpcMux } from '../stream.js';
import type { BoundWindow } from './types.js';

export function getValueAtPath(target: unknown, path: string[]): unknown {
	let current = target as Record<string, unknown>;
	for (let i = 0; i < path.length; i++) {
		const key = path[i]!;
		if (current == null || typeof current !== 'object') {
			throw new Error(
				`getValueAtPath: nothing at "${key}" (full path: ${path.join('.')})`,
			);
		}
		current = current[key] as Record<string, unknown>;
	}
	return current;
}

export async function closeTunnel(
	binding: BoundWindow,
	id: string,
): Promise<void> {
	const tunnel = binding.tunnels.get(id);
	if (!tunnel) return;

	binding.tunnels.delete(id);
	await tunnel.close();
}

export function createBoundWindow(
	name: string,
	webContents: WebContents,
	impl: unknown,
): BoundWindow {
	const channels = createChannels(name);
	const rootMux = createMainIpcMux<unknown, unknown>(
		webContents,
		channels.getIpcStreamChannel(),
	);
	const tunnels = new Map<string, Duplex<unknown, unknown>>();
	const binding: BoundWindow = {
		impl,
		rootMux,
		tunnels,
		dispose: async () => {
			const tunnelIds = [...tunnels.keys()];
			await Promise.allSettled(tunnelIds.map((id) => closeTunnel(binding, id)));

			await rootMux.close();
		},
	};

	return binding;
}
