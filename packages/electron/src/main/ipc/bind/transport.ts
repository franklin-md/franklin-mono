import { connect, type Duplex } from '@franklin/transport';

import { createChannels } from '../../../shared/channels.js';
import type { BoundWindow } from './types.js';
import { createBoundLease, getValueAtPath } from './bound-window.js';
import { registerLeaseLifecycle } from './lease.js';

export function registerTransportHandler(
	name: string,
	binding: BoundWindow,
	path: string[],
): Array<() => void> {
	const channels = createChannels(name);
	const streamChannel = channels.getTransportStreamChannel(path);

	return registerLeaseLifecycle(name, binding, path, async (id, ...args) => {
		const connectTransport = getValueAtPath(binding.impl, path) as (
			...connectArgs: unknown[]
		) => Promise<Duplex<unknown, unknown>>;
		const localTransport = await connectTransport(...args);
		const remoteTransport = binding.rootMux.channel(`${streamChannel}:${id}`);
		const tunnel = connect(localTransport, remoteTransport);

		return createBoundLease(localTransport, async () => {
			await tunnel.close();
		});
	});
}
