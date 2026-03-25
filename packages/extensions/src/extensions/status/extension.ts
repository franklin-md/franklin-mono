import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { StoreAPI } from '../../api/store/api.js';
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
