import { contextBridge } from 'electron';

import { bindPreload, createIpcStreamBridge } from './bind.js';
import { schema } from '../shared/schema.js';
import { createChannels } from '../shared/channels.js';

const channels = createChannels('franklin');

contextBridge.exposeInMainWorld(
	'__franklinBridge',
	bindPreload('franklin', schema),
);

contextBridge.exposeInMainWorld(
	'__franklinIpcStream',
	createIpcStreamBridge(channels.getIpcStreamChannel()),
);
