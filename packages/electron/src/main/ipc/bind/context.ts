import type { WebContents } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import { createMainIpcMux } from '../stream.js';
import { closeLease } from './registry/leases.js';
import type { BindingContext, BoundLease } from './types.js';

export function createBindingContext(
	name: string,
	webContents: WebContents,
	impl: unknown,
): BindingContext {
	const channels = createChannels(name);
	const rootMux = createMainIpcMux<unknown, unknown>(
		webContents,
		channels.getIpcStreamChannel(),
	);
	const leases = new Map<string, BoundLease>();
	const context: BindingContext = {
		impl,
		rootMux,
		leases,
		dispose: async () => {
			const leaseIds = [...leases.keys()];
			await Promise.allSettled(leaseIds.map((id) => closeLease(context, id)));

			await rootMux.close();
		},
	};

	return context;
}
