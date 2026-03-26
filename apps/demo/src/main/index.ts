import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { AuthManager } from '@franklin/auth';
import { initializeMain } from '@franklin/electron/main';
import { createFolderScopedFilesystem } from '@franklin/lib';
import { createNodePlatform } from '@franklin/node';

import type { MainHandle } from '@franklin/electron/main';

let handle: MainHandle | undefined;

function getPreloadPath(): string {
	return path.join(__dirname, '../preload/index.cjs');
}

function createWindow(): void {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: getPreloadPath(),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const nodePlatform = createNodePlatform();
	const environmentFilesystem = createFolderScopedFilesystem(
		path.join(app.getPath('home'), '.franklin'),
		nodePlatform.filesystem,
	);
	const environment = { filesystem: environmentFilesystem };
	const platform = {
		...nodePlatform,
		environment: async () => environment,
		filesystem: environmentFilesystem,
	};
	handle = initializeMain(mainWindow.webContents, platform);

	mainWindow.on('closed', () => {
		void handle?.dispose();
		handle = undefined;
	});

	// electron-vite injects ELECTRON_RENDERER_URL in dev
	if (process.env['ELECTRON_RENDERER_URL']) {
		void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
	} else {
		void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	}
}

void app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
