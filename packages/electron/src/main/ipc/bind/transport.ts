import { connect, type Duplex } from '@franklin/transport';

import { createChannels } from '../../../shared/channels.js';
import { getValueAtPath } from './lookup.js';
import { createBoundLease } from './registry/leases.js';
import { registerLeaseLifecycle } from './lease.js';
import type { BindingContext } from './types.js';

export function registerTransportHandler(
	name: string,
	context: BindingContext,
	path: string[],
): Array<() => void> {
	const channels = createChannels(name);
	const streamChannel = channels.getDuplexStreamChannel(path);

	return registerLeaseLifecycle(name, context, path, async (id, ...args) => {
		const connectTransport = getValueAtPath(context.impl, path) as (
			...connectArgs: unknown[]
		) => Promise<Duplex<unknown, unknown>>;
		const localTransport = await connectTransport(...args);
		const remoteTransport = context.rootMux.channel(`${streamChannel}:${id}`);
		const tunnel = connect(localTransport, remoteTransport);

		return createBoundLease(localTransport, async () => {
			await tunnel.close();
		});
	});
}
