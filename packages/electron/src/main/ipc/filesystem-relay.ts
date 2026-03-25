import { ipcMain } from 'electron';
import { createNodeFilesystem } from '@franklin/node';

import {
	FILESYSTEM_READ_FILE,
	FILESYSTEM_WRITE_FILE,
	FILESYSTEM_READ_DIR,
	FILESYSTEM_DELETE_FILE,
	FILESYSTEM_MKDIR,
	FILESYSTEM_ACCESS,
	FILESYSTEM_STAT,
	FILESYSTEM_EXISTS,
	FILESYSTEM_GLOB,
} from '../../shared/channels.js';

/**
 * Bridges file-system operations from the renderer process to the
 * main process over Electron IPC, so the renderer can persist
 * session data without direct `node:fs` access.
 */
export class FilesystemRelay {
	constructor() {
		const fs = createNodeFilesystem();

		ipcMain.handle(FILESYSTEM_READ_FILE, (_event, path: string) =>
			fs.readFile(path),
		);

		ipcMain.handle(
			FILESYSTEM_WRITE_FILE,
			(_event, path: string, data: string | Uint8Array) =>
				fs.writeFile(path, data),
		);

		ipcMain.handle(FILESYSTEM_ACCESS, (_event, path: string) =>
			fs.access(path),
		);

		// Serialize FileStat methods to plain booleans for IPC transport.
		ipcMain.handle(FILESYSTEM_STAT, async (_event, path: string) => {
			const stats = await fs.stat(path);
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory(),
			};
		});

		ipcMain.handle(FILESYSTEM_READ_DIR, (_event, path: string) =>
			fs.readdir(path),
		);

		ipcMain.handle(FILESYSTEM_EXISTS, (_event, path: string) =>
			fs.exists(path),
		);

		ipcMain.handle(
			FILESYSTEM_GLOB,
			(
				_event,
				pattern: string,
				options: { cwd: string; ignore?: string[]; limit?: number },
			) => fs.glob(pattern, options),
		);

		ipcMain.handle(FILESYSTEM_DELETE_FILE, (_event, path: string) =>
			fs.deleteFile(path),
		);

		ipcMain.handle(
			FILESYSTEM_MKDIR,
			(_event, path: string, options?: { recursive?: boolean }) =>
				fs.mkdir(path, options),
		);
	}

	dispose(): void {
		ipcMain.removeHandler(FILESYSTEM_READ_FILE);
		ipcMain.removeHandler(FILESYSTEM_WRITE_FILE);
		ipcMain.removeHandler(FILESYSTEM_ACCESS);
		ipcMain.removeHandler(FILESYSTEM_STAT);
		ipcMain.removeHandler(FILESYSTEM_READ_DIR);
		ipcMain.removeHandler(FILESYSTEM_EXISTS);
		ipcMain.removeHandler(FILESYSTEM_GLOB);
		ipcMain.removeHandler(FILESYSTEM_DELETE_FILE);
		ipcMain.removeHandler(FILESYSTEM_MKDIR);
	}
}
