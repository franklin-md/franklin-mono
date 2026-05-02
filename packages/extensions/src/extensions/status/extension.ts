import { defineExtension } from '../../harness/modules/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { createStatusControl } from './control.js';
import { statusKey } from './key.js';

export function statusExtension() {
	return defineExtension<[CoreModule, StoreModule]>((api) => {
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
