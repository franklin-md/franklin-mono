import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';

import { AgentRelay } from './agent-relay.js';

function getPreloadPath(): string {
	const esmPreload = path.join(__dirname, '../preload/index.mjs');

	if (existsSync(esmPreload)) {
		return esmPreload;
	}

	return path.join(__dirname, '../preload/index.js');
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

	const relay = new AgentRelay();

	// Subprocess stdout → renderer
	relay.setDataHandler((agentId, chunk) => {
		mainWindow.webContents.send('franklin:relay-data', agentId, chunk);
	});

	// Spawn agent subprocess, return agentId
	ipcMain.handle('franklin:spawn', (_event, agentName: string, cwd: string) => {
		return relay.create(agentName, cwd);
	});

	// Renderer → subprocess stdin
	ipcMain.on(
		'franklin:relay-data',
		(_event, agentId: string, chunk: Uint8Array) => {
			relay.write(agentId, chunk);
		},
	);

	// Dispose agent subprocess
	ipcMain.handle('franklin:dispose', (_event, agentId: string) => {
		return relay.dispose(agentId);
	});

	// electron-vite injects ELECTRON_RENDERER_URL in dev
	if (process.env['ELECTRON_RENDERER_URL']) {
		void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
	} else {
		void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	}

	mainWindow.on('closed', () => {
		ipcMain.removeHandler('franklin:spawn');
		ipcMain.removeAllListeners('franklin:relay-data');
		ipcMain.removeHandler('franklin:dispose');
		void relay.disposeAll();
	});
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
