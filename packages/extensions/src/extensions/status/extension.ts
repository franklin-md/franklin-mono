import { createExtension } from '../../algebra/index.js';
import type { CoreAPI } from '../../modules/core/index.js';
import type { StoreAPI } from '../../modules/store/index.js';
import type { StoreRuntime } from '../../modules/store/runtime.js';
import { createStatusControl } from './control.js';
import { statusKey } from './key.js';

export function statusExtension() {
	return createExtension<[CoreAPI, StoreAPI], [StoreRuntime]>((api) => {
		api.registerStore(statusKey, 'idle', 'private');

		api.on('prompt', (_prompt, ctx) => {
			const control = createStatusControl(ctx.getStore(statusKey));
			control.setInProgress();
		});

		api.on('turnEnd', (_event, ctx) => {
			const control = createStatusControl(ctx.getStore(statusKey));
			control.setUnread();
		});
	});
}
