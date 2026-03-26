import type { Duplex } from '@franklin/transport';

import { createChannels } from '../../../shared/channels.js';
import type { PreloadLeaseBridge } from '../../../shared/api.js';
import { createIpcStream } from '../stream.js';

export function bindTransport(
	name: string,
	path: string[],
	rawTransport: PreloadLeaseBridge<any, any>,
): (...args: unknown[]) => Promise<Duplex<unknown, unknown>> {
	const channels = createChannels(name);
	const streamChannel = channels.getDuplexStreamChannel(path);

	return async (...args: unknown[]) => {
		const id = await rawTransport.connect(...args);
		const inner = createIpcStream(`${streamChannel}:${id}`);

		return {
			readable: inner.readable,
			writable: inner.writable,
			close: async () => {
				await inner.close();
				await rawTransport.kill(id);
			},
		};
	};
}
