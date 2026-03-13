import { spawn as spawnProcess } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createDefaultRegistry } from '@franklin/agent';

interface RelayEntry {
	process: ChildProcess;
	agentName: string;
}

/**
 * Spawns ACP agent subprocesses and relays raw bytes to/from IPC.
 * Zero ACP awareness — just a byte-level bridge between the renderer
 * (via IPC) and agent subprocesses (via stdio).
 */
export class AgentRelay {
	private readonly registry = createDefaultRegistry();
	private readonly relays = new Map<string, RelayEntry>();
	private nextId = 0;
	private dataHandler: ((agentId: string, chunk: Uint8Array) => void) | null =
		null;

	/**
	 * Set the callback that receives subprocess stdout chunks.
	 * Typically wired to `webContents.send()`.
	 */
	setDataHandler(handler: (agentId: string, chunk: Uint8Array) => void): void {
		this.dataHandler = handler;
	}

	/**
	 * Spawn an agent subprocess and start relaying its stdout.
	 * Returns a unique agentId for routing.
	 */
	create(agentName: string, cwd: string): string {
		const spec = this.registry.get(agentName);
		const agentId = `agent-${this.nextId++}`;

		const proc = spawnProcess(spec.command, spec.args ?? [], {
			stdio: ['pipe', 'pipe', 'inherit'],
			cwd,
			env: spec.env ? { ...process.env, ...spec.env } : undefined,
		});

		// Pump subprocess stdout → data handler (→ renderer via IPC)
		proc.stdout.on('data', (chunk: Buffer) => {
			this.dataHandler?.(agentId, new Uint8Array(chunk));
		});

		proc.on('error', (err) => {
			console.error(`[AgentRelay] ${agentId} process error:`, err);
		});

		this.relays.set(agentId, { process: proc, agentName });
		return agentId;
	}

	/**
	 * Write bytes from the renderer into the agent subprocess stdin.
	 */
	write(agentId: string, chunk: Uint8Array): void {
		const entry = this.relays.get(agentId);
		if (!entry) throw new Error(`Unknown agent: ${agentId}`);
		// stdin is guaranteed to exist when stdio[0] is 'pipe'
		const { stdin } = entry.process;
		if (stdin) {
			stdin.write(Buffer.from(chunk));
		}
	}

	/**
	 * Kill an agent subprocess and clean up.
	 */
	async dispose(agentId: string): Promise<void> {
		const entry = this.relays.get(agentId);
		if (!entry) return;

		this.relays.delete(agentId);

		const proc = entry.process;
		if (proc.exitCode !== null) return;

		return new Promise<void>((resolve) => {
			proc.on('exit', () => resolve());
			proc.kill('SIGTERM');
		});
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this.relays.keys()].map((id) => this.dispose(id)));
	}
}
