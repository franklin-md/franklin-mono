import { contextBridge } from 'electron';

import { bindPreloadIpc } from './bind.js';
import { FRANKLIN_PROXY_CHANNEL_NAMESPACE } from '../shared/channels.js';

contextBridge.exposeInMainWorld(
	'__franklinIpc',
	bindPreloadIpc(FRANKLIN_PROXY_CHANNEL_NAMESPACE),
);
