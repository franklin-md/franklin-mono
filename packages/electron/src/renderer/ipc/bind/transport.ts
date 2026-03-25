import type { Duplex } from '@franklin/transport';

import { createChannels } from '../../../shared/channels.js';
import { createIpcStream } from '../stream.js';

export interface IpcTransportBridge {
	connect: (...args: unknown[]) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

export function bindTransport(
	name: string,
	path: string[],
	rawTransport: IpcTransportBridge,
): (...args: unknown[]) => Promise<Duplex<unknown, unknown>> {
	const channels = createChannels(name);
	const streamChannel = channels.getTransportStreamChannel(path);

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
