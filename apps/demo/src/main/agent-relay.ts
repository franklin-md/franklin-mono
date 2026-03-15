import type { IpcMain, WebContents } from 'electron';
import { createDefaultRegistry } from '@franklin/agent';
import { connect, StdioPipe } from '@franklin/transport';
import type { Connection } from '@franklin/transport';

import { createMainIpcStream } from './ipc/stream.js';

interface RelayEntry {
	connection: Connection;
	stdioPipe: StdioPipe;
	disposeIpc: () => void;
}

/**
 * Spawns ACP agent subprocesses and connects them to the renderer via IPC.
 *
 * Each agent gets a StdioPipe (subprocess) connected to a MainIpcPipe
 * (Electron IPC) — bytes flow bidirectionally with no manual pumping.
 */
export class AgentRelay {
	private readonly registry = createDefaultRegistry();
	private readonly relays = new Map<string, RelayEntry>();
	private nextId = 0;

	constructor(
		private readonly webContents: WebContents,
		private readonly ipcMain: IpcMain,
	) {}

	/**
	 * Spawn an agent subprocess and connect it to the renderer.
	 * Returns a unique agentId for routing.
	 */
	create(agentName: string, cwd: string): string {
		const spec = this.registry.get(agentName);
		const agentId = `agent-${this.nextId++}`;

		const stdioPipe = new StdioPipe({ ...spec, cwd });
		const { pipe: ipcPipe, dispose: disposeIpc } = createMainIpcStream({
			streamName: agentId,
			webContents: this.webContents,
			ipcMain: this.ipcMain,
		});

		// Connect subprocess stdio ↔ renderer IPC
		const connection = connect(stdioPipe.pipe, ipcPipe);

		this.relays.set(agentId, { connection, stdioPipe, disposeIpc });
		return agentId;
	}

	async dispose(agentId: string): Promise<void> {
		const entry = this.relays.get(agentId);
		if (!entry) return;
		this.relays.delete(agentId);

		await entry.connection.dispose();
		entry.disposeIpc();
		await entry.stdioPipe.dispose();
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this.relays.keys()].map((id) => this.dispose(id)));
	}
}
