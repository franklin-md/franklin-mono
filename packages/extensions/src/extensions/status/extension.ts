import type { Extension } from '../../algebra/types/index.js';
import type { CoreAPI } from '../../systems/core/index.js';
import type { StoreAPI } from '../../systems/store/index.js';
import { createStatusControl } from './control.js';
import { statusKey } from './key.js';

export function statusExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		const store = api.registerStore(statusKey, 'idle', 'private');
		const control = createStatusControl(store);

		api.on('prompt', () => {
			control.setInProgress();
		});

		api.on('turnEnd', () => {
			control.setUnread();
		});
	};
}
