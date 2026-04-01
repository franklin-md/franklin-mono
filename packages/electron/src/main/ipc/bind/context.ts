import type { WebContents } from 'electron';

import { closeLease } from './registry/leases.js';
import type { BindingContext, BoundLease } from './types.js';

export function createBindingContext(webContents: WebContents): BindingContext {
	const leases = new Map<string, BoundLease>();
	const disposables = new Set<() => Promise<void>>();
	const context: BindingContext = {
		webContents,
		leases,
		disposables,
		dispose: async () => {
			const leaseIds = [...leases.keys()];
			await Promise.allSettled(leaseIds.map((id) => closeLease(context, id)));
			const closeAll = [...disposables];
			disposables.clear();
			await Promise.allSettled(closeAll.map((close) => close()));
		},
	};

	return context;
}
