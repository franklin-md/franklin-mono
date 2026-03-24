import path from 'node:path';
import { app, ipcMain } from 'electron';

import { APP_GET_STORAGE } from '../../shared/channels.js';

function getStoragePath(): string {
	return path.join(app.getPath('userData'), 'storage');
}

export class AppRelay {
	constructor() {
		ipcMain.handle(APP_GET_STORAGE, () => getStoragePath());
	}

	dispose(): void {
		ipcMain.removeHandler(APP_GET_STORAGE);
	}
}
