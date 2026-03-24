import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { ipcMain } from 'electron';

import {
	PERSIST_READ_FILE,
	PERSIST_WRITE_FILE,
	PERSIST_READ_DIR,
	PERSIST_DELETE_FILE,
	PERSIST_MKDIR,
} from '../../shared/channels.js';

/**
 * Bridges file-system operations from the renderer process to the
 * main process over Electron IPC, so the renderer can persist
 * session data without direct `node:fs` access.
 */
export class PersistRelay {
	constructor() {
		ipcMain.handle(PERSIST_READ_FILE, (_event, path: string) =>
			readFile(path, 'utf-8'),
		);

		ipcMain.handle(PERSIST_WRITE_FILE, (_event, path: string, data: string) =>
			writeFile(path, data, 'utf-8'),
		);

		ipcMain.handle(PERSIST_READ_DIR, (_event, path: string) => readdir(path));

		ipcMain.handle(PERSIST_DELETE_FILE, (_event, path: string) => unlink(path));

		ipcMain.handle(PERSIST_MKDIR, (_event, path: string) =>
			mkdir(path, { recursive: true }).then(() => {}),
		);
	}

	dispose(): void {
		ipcMain.removeHandler(PERSIST_READ_FILE);
		ipcMain.removeHandler(PERSIST_WRITE_FILE);
		ipcMain.removeHandler(PERSIST_READ_DIR);
		ipcMain.removeHandler(PERSIST_DELETE_FILE);
		ipcMain.removeHandler(PERSIST_MKDIR);
	}
}
