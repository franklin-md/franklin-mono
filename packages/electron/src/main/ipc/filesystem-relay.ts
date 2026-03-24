import {
	access,
	glob,
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from 'node:fs/promises';
import { ipcMain } from 'electron';

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
		ipcMain.handle(FILESYSTEM_READ_FILE, (_event, path: string) =>
			readFile(path),
		);

		ipcMain.handle(
			FILESYSTEM_WRITE_FILE,
			(_event, path: string, data: string | Uint8Array) =>
				writeFile(path, data),
		);

		ipcMain.handle(FILESYSTEM_ACCESS, (_event, path: string) => access(path));

		ipcMain.handle(FILESYSTEM_STAT, async (_event, path: string) => {
			const stats = await stat(path);
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory(),
			};
		});

		ipcMain.handle(FILESYSTEM_READ_DIR, (_event, path: string) =>
			readdir(path),
		);

		ipcMain.handle(FILESYSTEM_EXISTS, async (_event, path: string) => {
			try {
				await access(path);
				return true;
			} catch {
				return false;
			}
		});

		ipcMain.handle(
			FILESYSTEM_GLOB,
			async (
				_event,
				pattern: string,
				options: { cwd: string; ignore?: string[]; limit?: number },
			) => {
				const results: string[] = [];
				for await (const entry of glob(pattern, {
					cwd: options.cwd,
					exclude: options.ignore,
				})) {
					results.push(entry);
					if (options.limit && results.length >= options.limit) break;
				}
				return results;
			},
		);

		ipcMain.handle(FILESYSTEM_DELETE_FILE, (_event, path: string) =>
			unlink(path),
		);

		ipcMain.handle(
			FILESYSTEM_MKDIR,
			(_event, path: string, options?: { recursive?: boolean }) =>
				mkdir(path, options).then(() => {}),
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
